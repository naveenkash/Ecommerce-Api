const router = require("express").Router();
const Carts = require("../models/cart");
const CartItems = require("../models/cartItem");
const Users = require("../models/user");
const Products = require("../models/product");
const Orders = require("../models/order");
const mongoose = require("mongoose");
const apiError = require("../error-handler/apiErrors");
const authenticateUser = require("../middlewares/authenticateUser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const randomId = require("../helper-methods/randomId");

/**
 * @param {user_id string}
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
 * @param {product_id string}
 * @param {user_id string}
 */
router.post("/add", authenticateUser, async (req, res, next) => {
  const body = req.body;
  if (body.quantity > 5 || body.quantity <= 0) {
    next(apiError.badRequest("Quantity limit max 5 min 1"));
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
 * @param {cart_item_id string}
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
 * @param {product_id string}
 * @param {quantity number}
 * @param {user_id string}
 * @param {type = add || remove boolean}
 */
router.post("/update", authenticateUser, async (req, res, next) => {
  const body = req.body;
  if (
    body.quantity < 1 ||
    body.quantity > 4 ||
    typeof body.quantity !== "number"
  ) {
    next(
      apiError.badRequest(
        "Atleast 1 quantity is needed max 4 to update or quantity must be a number"
      )
    );
    return;
  }
  try {
    const user = await Users.findById(body.user_id);
    const cart_item = await CartItems.findOne({
      cart_id: user.cart_id,
      product_id: body.product_id,
    });
    if (
      body.add &&
      typeof body.add == "boolean" &&
      cart_item.quantity + body.quantity <= 5
    ) {
      cart_item.quantity += body.quantity;
      await cart_item.save();
      res.status(200).json({
        cart_item,
      });
      return;
    } else if (
      body.remove &&
      typeof body.remove == "boolean" &&
      cart_item.quantity - body.quantity >= 1
    ) {
      cart_item.quantity -= body.quantity;
      await cart_item.save();
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
 * @param {stripeToken string}
 * @param {address {city string,state string,zip number,country string,street string} }
 * @param {tel string}
 */
router.post(
  "/checkout",
  authenticateUser,
  checkIfStripeTokenIsCreated,
  async (req, res, next) => {
    const body = req.body;
    let total_price = 0;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const user = await Users.findById(body.user_id).session(session);
      if (!user.cart_id) {
        next(apiError.badRequest("Add items to cart before checkout"));
        return;
      }
      const cartItems = await CartItems.find({ cart_id: user.cart_id });
      for (let i = 0; i < cartItems.length; i++) {
        const cartItem = cartItems[i];
        const product = await Products.findById(cartItem.product_id);
        if (product.quantity - cartItem.quantity < 0) {
          // if product quantity is less than 0 after reducing the cart item quantity
          next(
            apiError.interServerError("Product is not available for checkout")
          );
          return;
        }
        if (cartItem.quantity > 5) {
          // only 5 items of product is allowed per checkout
          next(apiError.badRequest("Quantity limit per order exceed"));
          return;
        }
        total_price += product.price * cartItem.quantity;
      }
      total_price = total_price.toFixed(2) * 100;

      const newOrder = await Orders({
        _id: mongoose.Types.ObjectId(),
        user_id: body.user_id,
        address: body.address,
        tel: body.tel,
        cart_id: user.cart_id,
        transaction_id: "null",
        payment_status: 2,
        total_price, // price in lowest currency value
        ordered_at: Date.now(),
      });
      const savedOrder = await newOrder.save();
      for (let i = 0; i < cartItems.length; i++) {
        const cartItem = cartItems[i];
        const product = await Products.findById(cartItem.product_id).session(
          session
        );
        product.quantity = product.quantity - cartItem.quantity;
        if (product.quantity < 0) {
          // if product quantity is less than 0 after reducing the cart item quantity
          next(
            apiError.interServerError("Product is not available for checkout")
          );
          return;
        }
        await product.save();
      }
      const charge = await stripe.charges.create(
        {
          amount: total_price,
          currency: "inr",
          source: body.stripeToken, // obtained with Stripe.js
          description: "Charge Description",
          metadata: {
            order_id: `${savedOrder._id}`,
          },
        },
        {
          idempotencyKey: randomId(),
        }
      );

      if (charge) {
        newOrder.payment_status = 1;
        newOrder.transaction_id = charge.id;
        newOrder.receipt_url = charge.receipt_url;
        await Carts.findByIdAndUpdate(
          user.cart_id,
          {
            $set: { checkout: true },
          },
          { useFindAndModify: false }
        );
        await CartItems.updateMany(
          { cart_id: user.cart_id, checkout: false },
          { $set: { checkout: true } }
        );
        user.cart_id = null; // set cart to null to create new cart after order is complete
        await newOrder.save();
        await user.save();
        await session.commitTransaction();
        res.status(200).json({
          order: newOrder,
        });
      } else {
        next(apiError.paymentRequierd("Error occured in charging acc"));
        return;
      }
    } catch (err) {
      await session.abortTransaction();
      next(apiError.interServerError(err.message));
    } finally {
      session.endSession();
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
