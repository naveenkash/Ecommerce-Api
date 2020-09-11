const router = require("express").Router();
const Users = require("../models/user");
const Orders = require("../models/order");
const Refunds = require("../models/refund");
const CartItems = require("../models/cartItem");
const Products = require("../models/product");
const mongoose = require("mongoose");
const authenticateUser = require("../middlewares/authenticateUser");
const apiError = require("../error-handler/apiErrors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

router.post("/", authenticateUser, async (req, res) => {
  const body = req.body;
  const orders = await Orders.find({
    user_id: body.user_id,
  });
  if (orders.length > 0) {
    res.status(200).json({
      orders,
    });
  } else {
    res.status(404).json({
      message: "No items in cart",
    });
  }
});

/**
 * @param {string} order_id - order id
 */
router.post("/cancel", authenticateUser, async (req, res, next) => {
  const body = req.body;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const user = await Users.findById(body.user_id);
    let order = await Orders.findById(body.order_id);
    if (order == null) {
      next(apiError.badRequest("Cannot find order by specified id"));
      return;
    }
    if (order && order.order_status == 1 && order.payment_status == 1) {
      order.order_status = 6;
      order.payment_status = 5;
      await order.save({ session });
      let cartItems = await CartItems.find({ cart_id: order.cart_id });
      await Promise.all(
        cartItems.map(async (cartItem) => {
          await Products.findByIdAndUpdate(cartItem.product_id, {
            $inc: { quantity: cartItem.quantity },
          }).session(session);
        })
      );
      const refunds = await new Refunds({
        _id: mongoose.Types.ObjectId(),
        refund_id: null,
        transaction_id: order.transaction_id,
        order_id: order._id,
        user_id: body.user_id,
        created_at: Date.now(),
      });
      await refunds.save({ session });
      await session.commitTransaction();

      const stripeRefund = await stripe.refunds.create({
        charge: order.transaction_id,
        metadata: { order_id: body.order_id },
      });

      refunds.refund_id = stripeRefund.id;
      await refunds.save();

      let cancellation_email_sent = false;
      try {
        const msg = {
          to: user.email,
          from: "order-noreply@your-url.com",
          subject: "Subject of the email",
          text: "Text of the mail", // text should be plain version of html
          html: "Email template ex: <strong>Order Canceclled</strong>",
        };
        await sgMail.send(msg);
        cancellation_email_sent = true;
      } catch (error) {
        cancellation_email_sent = false;
      }
      res.status(200).json({
        message: "Order cancelled. Refund process started",
        cancellation_email_sent,
      });
      return;
    } else {
      next(apiError.forbidden("Cannot cancel order"));
      return;
    }
  } catch (error) {
    await session.abortTransaction();
    next(apiError.interServerError(error.message));
    return;
  } finally {
    session.endSession();
  }
});

module.exports = router;
