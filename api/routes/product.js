const router = require("express").Router();
const mongoose = require("mongoose");
const Products = require("../models/product");
const CartItems = require("../models/cartItem");
const Users = require("../models/user");
const SoldProducts = require("../models/soldProduct");
const apiError = require("../error-handler/apiErrors");
const authenticateUser = require("../middlewares/authenticateUser");
const formidable = require("formidable");
const uploadToAWS = require("../helper-methods/uploadToAws.js");
const deleteFromAws = require("../helper-methods/deleteFromAws.js");
const getTodayDate = require("../helper-methods/getTodayDate.js");
const checkFileType = require("../helper-methods/checkFileType.js");

// must be admin to add update delete product
router.get("/", async (req, res, next) => {
  try {
    const products = await Products.find();
    if (products.length <= 0) {
      next(apiError.notFound("Not Found"));
      return;
    } else {
      res.status(200).json({
        message: "Successfull",
        products,
      });
    }
  } catch (error) {
    next(apiError.interServerError(error.message));
  }
});

/**
 * @param {timestamp} [req.query.time=86400000] - amount of time in milliseconds in past to calculate trending products
 */
router.get("/trending", async (req, res, next) => {
  try {
    let date = new Date();
    let year = date.getFullYear();
    let Month = date.getMonth();
    let todayDate = date.getDate();
    let milliseconds_till_today = new Date(
      `${year}/${Month}/${todayDate}`
    ).getTime();
    const time = req.query.time;
    if (time) {
      if (Number.isNaN(parseInt(time))) {
        next(apiError.badRequest("Timestamp is not type number"));
        return;
      }
    }
    let milliseconds = time || 1000 * 60 * 60 * 24; // specified time or past 24 hrs
    const productsSoldPastDay = await SoldProducts.find({
      ordered_at: { $gte: milliseconds_till_today - milliseconds },
    });

    let productsSoldMap = new Map();
    if (productsSoldPastDay.length > 0) {
      for (let i = 0; i < productsSoldPastDay.length; i++) {
        const product = productsSoldPastDay[i];
        if (productsSoldMap.has(product.product_id)) {
          let curValue = productsSoldMap.get(product.product_id);
          productsSoldMap.set(product.product_id, curValue + product.quantity);
        } else {
          productsSoldMap.set(product.product_id, product.quantity);
        }
      }
      let trendingProducts = Array.from(
        productsSoldMap,
        ([product_id, product_sold]) => ({
          product_id,
          product_sold,
        })
      );
      trendingProducts.sort((a, b) => {
        return b.product_sold - a.product_sold;
      });

      let result = Array.from(trendingProducts, (trending_product) => ({
        id: trending_product.product_id,
      })).slice(0, 4);

      res.status(200).json({
        trending_products: result,
      });
    } else {
      res.status(200).json({
        trending_products: [],
      });
    }
  } catch (error) {
    next(apiError.interServerError(error.message));
    return;
  }
});

/**
 * @param {string} product_id - product id
 */
router.get("/single/:productId", async (req, res, next) => {
  const id = req.params.productId;
  try {
    const product = await Products.findById(id);
    if (product) {
      res.status(200).json({
        message: "Successfull",
        product,
      });
      return;
    } else {
      next(apiError.notFound("Cannot found product with specified id"));
      return;
    }
  } catch (error) {
    next(apiError.interServerError(error.message));
    return;
  }
});

/**
 * @param {string} req.query.q - query to search for product
 */
router.get("/search/", async (req, res, next) => {
  const query = req.query;
  if (!query.q) {
    next(apiError.interServerError("Add a query parameter (q) to search"));
    return;
  }
  if (!query.limit) {
    query.limit = 10;
  }
  if (query.limit <= 0 || query.limit > 100) {
    next(apiError.interServerError("Limit per query is min 1 or max 100"));
    return;
  }
  query.limit = parseInt(query.limit);
  try {
    let products;
    if (!query.last_time) {
      products = await Products.find({
        name: { $regex: query.q, $options: "gi" },
      })
        .sort({ created_at: -1 })
        .limit(query.limit);
    } else {
      query.last_time = parseInt(query.last_time);
      products = await Products.find({
        name: { $regex: query.q, $options: "gi" },
        created_at: { $lt: query.last_time },
      })
        .sort({ created_at: -1 })
        .limit(query.limit);
    }
    let last_time;
    if (products.length > 0) {
      last_time = products[products.length - 1].created_at;
    }
    res.status(200).json({
      products,
      last_time,
    });
  } catch (error) {
    next(apiError.interServerError(error.message));
    return;
  }
});

/**
 * type formData
 * @param {string} name - product name
 * @param {string} description - product description
 * @param {number} price - product price
 * @param {number} quantity - product quantity
 * @param {string} currency - product currency code
 * @param {images} files - images for product
 */
router.post("/new", authenticateUser, checkIfAdmin, async (req, res, next) => {
  const form = new formidable.IncomingForm({ multiples: true });
  try {
    let images = [];
    form.parse(req, async (error, fields, files) => {
      if (error) {
        next(apiError.interServerError(error.message));
        return;
      }
      if (!files.files || files.files.length > 10) {
        next(
          apiError.interServerError(
            "Provide atleast 1 image or Only 10 images per product is allowed"
          )
        );
        return;
      }
      if (!checkFileType.areFilesValid(files.files)) {
        next(apiError.badRequest("Files not Valid"));
        return;
      }

      images = await uploadFilesToAws(files);

      const product = new Products({
        _id: mongoose.Types.ObjectId(),
        name: fields.name,
        price: fields.price,
        quantity: fields.quantity,
        description: fields.description,
        currency: fields.currency,
        images,
        created_at: Date.now(),
      });

      await product.save();
      res.status(201).json({
        message: "Successfull",
      });
      return;
    });
  } catch (error) {
    next(apiError.interServerError(error.message));
    return;
  }
});

/**
 * type formData
 * @param {string} product_id - product id
 * @param {string} name - product name
 * @param {string} description - product description
 * @param {number} price - product price
 * @param {number} quantity - product quantity
 * @param {images} files - images for product to add
 * @param {string[]} img_keys - aws image keys to remove from aws
 */
router.post(
  "/update",
  authenticateUser,
  checkIfAdmin,
  async (req, res, next) => {
    const form = new formidable.IncomingForm({ multiples: true });
    form.parse(req, async (error, fields, files) => {
      if (error) {
        next(apiError.interServerError(error.message));
        return;
      }

      if (fields.name && fields.name.length <= 0) {
        next(apiError.interServerError(`Name cannot be empty`));
        return;
      } else if (fields.description && fields.description.length <= 0) {
        next(apiError.interServerError(`Description cannot be empty`));
        return;
      } else if (fields.quantity && fields.quantity <= 0) {
        next(apiError.interServerError(`Quantity cannot be ${quantity}`));
        return;
      } else if (fields.price && fields.price <= 0) {
        next(apiError.interServerError(`Price cannot be ${price}`));
        return;
      }

      let product = null,
        images = [],
        imgKeysIsPresent = false,
        updated = false,
        id = fields.product_id,
        imagesToAddLength = 0,
        currentPresentImagesLength,
        filesIsPresent = files.files && files.files.length > 0,
        imgKeys = fields.img_keys ? JSON.parse(fields.img_keys) : [];
      imgKeysIsPresent = imgKeys && imgKeys.length > 0;

      // get the current product
      try {
        product = await Products.findById(id);
        currentPresentImagesLength = product.images.length;
      } catch (error) {
        next(apiError.interServerError(error.message));
        return;
      }

      // upload new files to aws if present
      try {
        if (filesIsPresent) {
          imagesToAddLength = files.files.length;
          if (!checkFileType.areFilesValid(files.files)) {
            next(apiError.badRequest("Files not Valid"));
            return;
          }
        }
        if (currentPresentImagesLength + imagesToAddLength > 10) {
          next(apiError.badRequest("Only 10 images allowed per product"));
          return;
        }
        let totalImages = currentPresentImagesLength + imagesToAddLength;
        if (imgKeysIsPresent && imgKeys.length >= totalImages) {
          next(apiError.interServerError("Cannot remove all images"));
          return;
        }
        if (filesIsPresent) {
          images = await uploadFilesToAws(files);
        }
      } catch (error) {
        next(apiError.interServerError(error.message));
        return;
      }

      // update the product
      try {
        const session = await mongoose.startSession();
        try {
          session.startTransaction();
          product.name = fields.name || product.name;
          product.price = fields.price || product.price;
          product.description = fields.description || product.description;
          product.quantity = fields.quantity || product.quantity;

          if (filesIsPresent) {
            product.images = [...product.images, ...images];
          }
          if (imgKeysIsPresent) {
            product.images = product.images.filter((img) => {
              return !imgKeys.includes(img.key);
            });
          }
          const updatedProduct = await product.save({ session });
          await CartItems.updateMany(
            { product_id: id, checkout: false },
            {
              $set: {
                price: fields.price || updatedProduct.price,
                name: fields.name || updatedProduct.name,
                description: fields.description || updatedProduct.description,
              },
            }
          ).session(session);
          await session.commitTransaction();
          updated = true;
        } catch (error) {
          await session.abortTransaction();
          next(apiError.interServerError(error.message));
          return;
        } finally {
          session.endSession();
        }
      } catch (error) {
        next(apiError.interServerError(error.message));
        return;
      }

      // Delete the images from aws
      try {
        if (imgKeysIsPresent) {
          await deleteFilesFromAws(imgKeys);
        }
        if (updated) {
          res.status(200).json({ message: "updated!" });
          return;
        }
      } catch (error) {
        next(apiError.interServerError(error.message));
        return;
      }
    });
  }
);

async function deleteFilesFromAws(imgkeys) {
  try {
    for (let i = 0; i < imgkeys.length; i++) {
      const key = imgkeys[i];
      await deleteFromAws(key);
    }
  } catch (error) {
    throw new Error(error.message);
  }
}

async function uploadFilesToAws(files) {
  let images = [];
  try {
    if (!Array.isArray(files.files)) {
      let folderName = `product-images/${getTodayDate()}`;
      const res = await uploadToAWS(folderName, files.files);
      images.push({ url: res.Location, key: res.Key });
    } else {
      for (let i = 0; i < files.files.length; i++) {
        const file = files.files[i];
        let folderName = `product-images/${getTodayDate()}`;
        const res = await uploadToAWS(folderName, file);
        images.push({ url: res.Location, key: res.Key });
      }
    }
    return images;
  } catch (error) {
    throw new Error(error.message);
  }
}

async function checkIfAdmin(req, res, next) {
  const body = req.body;
  const admin = await Users.findOne({ role: "admin" });
  if (admin._id != body.user_id) {
    next(apiError.forbidden("No access allowed"));
    return;
  }
  next();
}

module.exports = router;
