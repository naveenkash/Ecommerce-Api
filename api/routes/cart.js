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
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * @param {user_id string}
 */
router.get("/", authenticateUser, async (req, res, next) => {
  const body = req.body;
  try {
    const user = await Users.findById(body.user_id);
    if (user.cart_id) {
      const cart = await Carts.findById(user.cart_id);
      if (cart && !cart.checkout) {
        const cartItems = await CartItems.find({
          cart_id: cart._id,
          checkout: false,
        });
        res.status(200).json({
          cart: cartItems,
        });
      } else {
        res.status(200).json({
          cart: [],
        });
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
 * @param {quantity number} optional default 1
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
        checkout: false,
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
          user_id: body.user_id,
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
            "Product id not correct or product is not available"
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
          { useFindAndModify: false }
        );
        const newCartItem = new CartItems({
          _id: mongoose.Types.ObjectId(),
          cart_id: newCreatedCart._id,
          product_id: product._id,
          user_id: body.user_id,
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
            "Product id not correct or product is not available"
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
  if (!body.quantity) {
    next(apiError.badRequest("Quantity not present"));
    return;
  }
  if (
    body.quantity < -1 ||
    body.quantity > 1 ||
    typeof body.quantity !== "number"
  ) {
    next(apiError.badRequest("Quantity must 1 or -1 and must be a number"));
    return;
  }
  try {
    const user = await Users.findById(body.user_id);
    const cart_item = await CartItems.findOne({
      cart_id: user.cart_id,
      product_id: body.product_id,
    });
    let q = cart_item.quantity;
    if (q + body.quantity <= 5 && q + body.quantity >= 1) {
      cart_item.quantity += body.quantity;
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
    const session = await mongoose.startSession();
    const session2 = await mongoose.startSession();
    const user = await Users.findById(body.user_id);
    const cartItems = await CartItems.find({
      cart_id: user.cart_id,
      checkout: false,
    });
    let total_price = 0,
      cart_id = "",
      savedOrder = null;
    try {
      // start first transaction
      session.startTransaction();
      if (!user.cart_id) {
        next(apiError.badRequest("Add items to cart before checkout"));
        return;
      }
      cart_id = user.cart_id;
      user.cart_id = ""; // set cart to empty to create new cart after order is complete
      await user.save();

      let cartItemsArray = [];
      for (let i = 0; i < cartItems.length; i++) {
        cartItemsArray.push(cartItems[i].product_id);
      }
      const products = await Products.find({
        _id: { $in: cartItemsArray },
      });

      products.forEach(async (product, index) => {
        let cartItem = cartItems[index];
        let quantity = 0;
        quantity = product.quantity - cartItem.quantity;
        if (quantity < 0) {
          // if product quantity is less than 0 after reducing the cart item quantity
          next(
            apiError.interServerError("Product is not available for checkout")
          );
          return;
        }
        total_price += product.price * cartItem.quantity;
      });
      total_price = Math.round(total_price.toFixed(2) * 100);

      const newOrder = await Orders({
        _id: mongoose.Types.ObjectId(),
        user_id: body.user_id,
        address: body.address,
        tel: body.tel,
        cart_id: cart_id,
        transaction_id: "null",
        payment_status: 2,
        total_price, // price in lowest currency value
        ordered_at: Date.now(),
        order_status: 5,
      });
      savedOrder = await newOrder.save({ session });
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      next(apiError.interServerError(err.message));
      return;
    } finally {
      session.endSession();
    }
    let charge = null;
    try {
      charge = await stripe.charges.create(
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
    } catch (error) {
      next(apiError.badRequest(error.message));
      return;
    }
    try {
      if (charge.paid) {
        // start second seperate transaction
        session2.startTransaction();
        let cartItemsArray = [];
        for (let i = 0; i < cartItems.length; i++) {
          cartItemsArray.push(cartItems[i].product_id);
        }
        const products = await Products.find({
          _id: { $in: cartItemsArray },
        });

        products.forEach(async (product, index) => {
          let cartItem = cartItems[index];
          await Products.findByIdAndUpdate(product._id, {
            $inc: {
              quantity: -cartItem.quantity,
            },
          }).session(session2);
        });

        savedOrder = await Orders.findByIdAndUpdate(
          savedOrder._id,
          {
            $set: {
              payment_status: 1,
              transaction_id: charge.id,
              receipt_url: charge.receipt_url,
              order_status: 1,
            },
          },
          { new: true }
        ).session(session2);

        await Carts.findByIdAndUpdate(cart_id, {
          $set: { checkout: true },
        }).session(session2);

        await CartItems.updateMany(
          { cart_id, checkout: false },
          { $set: { checkout: true } }
        ).session(session2);

        await session2.commitTransaction();
        let receipt_mailed = true;
        try {
          const msg = {
            to: user.email,
            from: "order-noreply@your-url.com",
            subject: "Subject of the email",
            text: "Text of the mail", // text should be plain version of html
            html: "Email template ex: <strong>Order Created</strong>",
          };
          await sgMail.send(msg);
        } catch (error) {
          receipt_mailed = false;
        }
        res.status(200).json({
          order: savedOrder,
          receipt_mailed,
        });
      } else {
        next(apiError.paymentRequierd("Error occured in charging acc"));
        return;
      }
    } catch (err) {
      await session2.abortTransaction();
      next(apiError.interServerError(err.message));
      return;
    } finally {
      session2.endSession();
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
