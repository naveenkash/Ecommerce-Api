const router = require("express").Router();
const mongoose = require("mongoose");
const Products = require("../models/product");
const CartItems = require("../models/cartItem");
const apiError = require("../error-handler/apiErrors");
const authenticateUser = require("../middlewares/authenticateUser");

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
 * @param {product name}
 * @param {product price}
 * @param {product quantity}
 * @param {product currency}
 * @param {user_id}
 */
router.post("/new", authenticateUser, async (req, res, next) => {
  const body = req.body;
  try {
    const product = new Products({
      _id: mongoose.Types.ObjectId(),
      name: body.name,
      price: body.price,
      quantity: body.quantity,
      currency: body.currency,
      user_id: body.user_id,
    });
    const newProduct = await product.save();
    res.status(201).json({
      message: "Successfull",
      product: newProduct,
    });
    return;
  } catch (error) {
    next(apiError.interServerError(error.message));
    return;
  }
});

/**
 * @param {update_product object}
 * @param {product_id}
 */
router.post("/update", authenticateUser, async (req, res, next) => {
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
});

module.exports = router;
