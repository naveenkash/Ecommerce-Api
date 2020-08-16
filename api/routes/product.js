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
 * @param {product_id}
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
 * @param {formData}
 * @param {formData name}
 * @param {formData description}
 * @param {formData price}
 * @param {formData quantity}
 * @param {formData currency}
 * @param {formData files->key file->value}
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

      if (!Array.isArray(files.files)) {
        let folderName = `product-images/${getTodayDate()}`;
        const res = await uploadToAWS(folderName, files.files);
        images.push({ location: res.Location });
      } else {
        for (let i = 0; i < files.files.length; i++) {
          const file = files.files[i];
          let folderName = `product-images/${getTodayDate()}`;
          const res = await uploadToAWS(folderName, file);
          images.push({ location: res.Location });
        }
      }

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
 * @param {update_product object}
 * @param {product_id}
 */
router.post(
  "/update",
  authenticateUser,
  checkIfAdmin,
  async (req, res, next) => {
    const body = req.body;
    const id = body.product_id;
    const update_product = body.update_product;
    try {
      if (
        !(Object.keys(update_product).length === 0) &&
        update_product.constructor === Object
      ) {
        const updated_product = await Products.findByIdAndUpdate(
          id,
          update_product,
          {
            new: true,
            useFindAndModify: false,
          }
        );
        await CartItems.updateMany(
          { product_id: id, checkout: false },
          {
            $set: {
              price: update_product.price || updated_product.price,
              name: update_product.name || updated_product.name,
              description:
                update_product.description || updated_product.description,
            },
          }
        );
        res.status(200).json({ message: "updated!" });
      } else {
        res.status(400).json({
          message: "Nothing to update",
        });
      }
    } catch (error) {
      next(apiError.interServerError(error.message));
      return;
    }
  }
);

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
