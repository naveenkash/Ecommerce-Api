const router = require("express").Router();
const mongoose = require("mongoose");
const Products = require("../models/product");
const CartItems = require("../models/cartItem");
const Users = require("../models/user");
const apiError = require("../error-handler/apiErrors");
const authenticateUser = require("../middlewares/authenticateUser");
const formidable = require("formidable");
const uploadToAWS = require("../helper-methods/uploadToAws.js");

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
 * @param {product_id}
 */
router.get("/:productId", async (req, res, next) => {
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
      if (files.files.length > 10) {
        next(
          apiError.interServerError("Only 10 images per product is allowed")
        );
        return;
      }
      let allFilesValid = true;
      files.files.forEach((file) => {
        if (file == null || !fileFilter(file) || file.size <= 0) {
          allFilesValid = false;
        }
      });
      if (!allFilesValid) {
        next(
          apiError.interServerError(
            "Provide atleast 1 file or must be a supported file type or file size must be bigger than 0"
          )
        );
        return;
      }

      for (let i = 0; i < files.files.length; i++) {
        const file = files.files[i];
        const res = await uploadToAWS(file);
        images.push({ location: res.Location });
      }

      const product = new Products({
        _id: mongoose.Types.ObjectId(),
        name: fields.name,
        price: fields.price,
        quantity: fields.quantity,
        description: fields.description,
        currency: fields.currency,
        images,
      });

      const newProduct = await product.save();
      res.status(201).json({
        message: "Successfull",
        product: newProduct,
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

function fileFilter(file) {
  const allowedTypes = ["image/jpg", "image/jpeg", "image/png"];
  if (!allowedTypes.includes(file.type)) {
    return false;
  }
  return true;
}

module.exports = router;
