const router = require("express").Router();
const mongoose = require("mongoose");
const Products = require("../models/product");
const CartItems = require("../models/cartItem");
const Feedbacks = require("../models/feedback");
const authenticateUser = require("../middlewares/authenticateUser");
const apiError = require("../error-handler/apiErrors");

/**
 * @param {stars number}
 * @param {product_id string}
 * @param {feedback string} optional
 */
router.post(
  "/create",
  authenticateUser,
  CheckIfItemBought,
  async (req, res, next) => {
    const body = req.body;
    if (!body.stars || body.stars > 5 || body.stars < 1) {
      next(apiError.badRequest("Stars atleast must be 1 or max 5"));
      return;
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const product = await Products.findById(body.product_id).session(session);
      let feedback = await Feedbacks.findOne({
        product_id: body.product_id,
        user_id: body.user_id,
      }).session(session);

      if (!product) {
        next(apiError.badRequest("Cannot found product with specified id"));
        return;
      }

      product.total_stars += feedback
        ? convertToInt(body.stars) - feedback.stars
        : convertToInt(body.stars);
      product.total_reviews += feedback ? 0 : 1;
      product.average_review = (
        (product.total_stars / (product.total_reviews * 5)) *
        5
      ).toFixed(1);

      if (feedback) {
        if (feedback.stars <= 1 && body.stars <= 1) {
          next(apiError.badRequest("Cannot update stars less than 1"));
          return;
        }
        feedback.stars = convertToInt(body.stars);
        feedback.feedback = body.feedback ? body.feedback : "";
      }
      if (!feedback) {
        feedback = new Feedbacks({
          _id: mongoose.Types.ObjectId(),
          product_id: product._id,
          stars: convertToInt(body.stars),
          feedback: body.feedback ? body.feedback : "",
          user_id: body.user_id,
        });
      }

      await product.save();
      await feedback.save();
      await session.commitTransaction();
      res.status(200).json({
        message: "Done!",
      });
    } catch (error) {
      await session.abortTransaction();
      next(apiError.interServerError(error.message));
      return;
    } finally {
      session.endSession();
    }
  }
);

/**
 * @param {product_id string}
 */
router.get(
  "/:productId",
  authenticateUser,
  CheckIfItemBought,
  async (req, res, next) => {
    const productId = req.params.productId;
    const body = req.body;
    try {
      const feedback = await Feedbacks.findOne({
        product_id: productId,
        user_id: body.user_id,
      });
      if (!feedback) {
        next(apiError.badRequest("Cannot found product with specified id"));
        return;
      }
      res.status(200).json({
        feedback,
      });
    } catch (error) {
      next(apiError.interServerError(error.message));
      return;
    }
  }
);

/**
 * @param {product_id string}
 */
router.post("/remove", authenticateUser, async (req, res, next) => {
  const body = req.body;
  try {
    const deletedFeedback = await Feedbacks.findOneAndDelete({
      product_id: body.product_id,
      user_id: body.user_id,
    });
    if (!deletedFeedback) {
      next(
        apiError.notFound("Cannot found feedback to delete with specified id")
      );
      return;
    }
    res.status(200).json({
      message: "Removed successfully",
      item: deletedFeedback,
    });
    return;
  } catch (error) {
    next(apiError.interServerError(error.message));
    return;
  }
});

function convertToInt(num) {
  return parseInt(num);
}

async function CheckIfItemBought(req, res, next) {
  const body = req.body;
  const itemBought = await CartItems.findOne({
    user_id: body.user_id,
    product_id: body.product_id,
    checkout: true,
  });
  if (itemBought) {
    next();
    return;
  }
  next(apiError.badRequest("Cannot post feedback becasue items not bought"));
  return;
}

module.exports = router;
