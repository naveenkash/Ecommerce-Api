const router = require("express").Router();
const Carts = require("../models/cart");
const CartItems = require("../models/cartItem");
const Users = require("../models/user");
const Products = require("../models/product");
const mongoose = require("mongoose");
const apiError = require("../error-handler/apiErrors");
const authenticateUser = require("../middlewares/authenticateUser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * @param {user_id}
 */
router.get("/", authenticateUser, async (req, res, next) => {
  const body = req.body;
  try {
    const user = await Users.findById(body.user_id);
    const cart = await Carts.findById(user.cart_id);
    if (user.cart_id && !cart.checkout) {
      if (cart) {
        const cartItems = await CartItems.find({ cart_id: cart._id });
        res.status(200).json({
          cart: cartItems,
        });
      } else {
        next(apiError.notFound("Not Found"));
        return;
      }
    } else {
      res.status(200).json({
        cart: [],
      });
      return;
    }
  } catch (error) {
    next(apiError.badRequest("Error Occured"));
    return;
  }
});

/**
 * @param {product_id}
 * @param {user_id}
 */
router.post("/add", authenticateUser, async (req, res, next) => {
  const body = req.body;
  if (body.quantity > 5) {
    next(apiError.badRequest("Quantity limit per order exceeds"));
    return;
  }
  try {
    const user = await Users.findById(body.user_id);
    const product = await Products.findById(body.product_id);

    if (user.cart_id) {
      const cartItem = await CartItems.findOne({
        cart_id: user.cart_id,
        product_id: body.product_id,
      });
      if (cartItem) {
        next(apiError.badRequest("Item already exist"));
        return;
      }
      if (product && product.quantity > 0) {
        const newCartItem = new CartItems({
          _id: mongoose.Types.ObjectId(),
          cart_id: user.cart_id,
          product_id: product._id,
          quantity: body.quantity || 1,
          price: product.price,
          name: product.name,
          description: product.description,
          checkout: false,
        });
        const savedCartItem = await newCartItem.save();
        res.status(200).json({
          item_added: savedCartItem,
        });
        return;
      } else {
        next(
          apiError.badRequest(
            "Product id not correct or product is nto available"
          )
        );
        return;
      }
    } else {
      if (product && product.quantity > 0) {
        const newCart = new Carts({
          _id: mongoose.Types.ObjectId(),
          user_id: user._id,
          checkout: false,
        });
        const newCreatedCart = await newCart.save();
        await Users.findByIdAndUpdate(
          user._id,
          {
            cart_id: newCreatedCart._id,
          },
          { useFindAndModify: true }
        );
        const newCartItem = new CartItems({
          _id: mongoose.Types.ObjectId(),
          cart_id: newCreatedCart._id,
          product_id: product._id,
          quantity: body.quantity || 1,
          price: product.price,
          name: product.name,
          description: product.description,
          checkout: false,
        });
        const newCreatedCartItem = await newCartItem.save();
        res.status(200).json({
          item_added: newCreatedCartItem,
        });
        return;
      } else {
        next(
          apiError.badRequest(
            "Product id not correct or product is nto available"
          )
        );
        return;
      }
    }
  } catch (error) {
    next(apiError.interServerError(error.message));
    return;
  }
});

/**
 * @param {cart_item_id}
 */
router.post("/remove", authenticateUser, async (req, res, next) => {
  const body = req.body;
  try {
    const deletedCartItem = await CartItems.findOneAndDelete({
      _id: body.cart_item_id,
    });
    if (!deletedCartItem) {
      next(
        apiError.notFound("Cannot found cart item to delete with specified id")
      );
      return;
    }
    res.status(200).json({
      message: "Removed successfully",
      item: deletedCartItem,
    });
    return;
  } catch (error) {
    next(apiError.interServerError(error.message));
    return;
  }
});

/**
 * @param {product_id}
 * @param {quantity}
 * @param {user_id}
 * @param {type = add || remove}
 */
router.post("/update", authenticateUser, async (req, res, next) => {
  const body = req.body;
  if (body.quantity > 4) {
    // we already have 1 item of a product
    next(apiError.badRequest("Quantity limit per order exceeds"));
    return;
  }
  try {
    const user = await Users.findById(body.user_id);
    const cart_item = await CartItems.findOne({
      cart_id: user.cart_id,
      product_id: body.product_id,
    });

    if (body.add && cart_item.quantity + body.quantity <= 5) {
      const cart_item = await CartItems.findOneAndUpdate(
        {
          cart_id: user.cart_id,
          product_id: body.product_id,
        },
        {
          $inc: { quantity: body.quantity },
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({
        cart_item,
      });
      return;
    } else if (body.remove && cart_item.quantity - body.quantity >= 1) {
      const cart_item = await CartItems.findOneAndUpdate(
        {
          cart_id: user.cart_id,
          product_id: body.product_id,
        },
        {
          $inc: { quantity: -body.quantity },
        },
        { new: true, useFindAndModify: false }
      );
      res.status(200).json({
        cart_item,
      });
      return;
    } else {
      // only max 5 min 1 items per order allowed
      next(apiError.badRequest("Only max 5 min 1 items per order"));
      return;
    }
  } catch (error) {
    next(apiError.interServerError(error.message));
    return;
  }
});

/**
 * @param {stripeToken}
 */
router.post(
  "/checkout",
  authenticateUser,
  checkIfStripeTokenIsCreated,
  async (req, res, next) => {
    const body = req.body;
    let total_price = 0;
    try {
      const user = await Users.findById(body.user_id);
      const cartItems = await CartItems.find({ cart_id: user.cart_id });
      for (let i = 0; i < cartItems.length; i++) {
        const item = cartItems[i];
        const product = await Products.findById(item.product_id);
        if (!product && product.quantity <= 0) {
          // if product is not available or product quantity is 0
          next(
            apiError.interServerError("Product is not available for checkout")
          );
          return;
        }
        if (item.quantity > 5) {
          // only 5 items of product is allowed per checkout
          next(apiError.badRequest("Quantity limit per order exceed"));
          return;
        }
        total_price += product.price * item.quantity;
      }
      total_price = total_price.toFixed(2) * 100;
      const charge = await stripe.charges.create(
        {
          amount: total_price,
          currency: "inr",
          source: body.stripeToken, // obtained with Stripe.js
          description: "My First Test Charge",
        },
        {
          idempotencyKey: crypto.randomBytes(16).toString("hex"),
        }
      );
      res.status(200).json({
        charge,
      });
    } catch (err) {
      next(apiError.interServerError(err.message));
    }
  }
);

function checkIfStripeTokenIsCreated(req, res, next) {
  const body = req.body;
  if (!body.stripeToken) {
    res.status(400).json({
      err: "Payment token not found",
    });
    return;
  } else {
    next();
  }
}

module.exports = router;
