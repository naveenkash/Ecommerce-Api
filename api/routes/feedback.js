const router = require("express").Router();
const mongoose = require("mongoose");
const Products = require("../models/product");
const CartItems = require("../models/cartItem");
const Feedbacks = require("../models/feedback");
const authenticateUser = require("../middlewares/authenticateUser");
const apiError = require("../error-handler/apiErrors");

/**
 * @param {string} product_id - product id
 * @param {timestamp} [last_time] - timestamp to skip
 * @param {number} [limit=10] - number of items to return
 */
router.post("/all", authenticateUser, async (req, res, next) => {
  const body = req.body;
  try {
    body.limit = convertToInt(body.limit);
    body.last_time = convertToInt(body.last_time);
    let limit = body.limit || 10; // default

    if (body.limit <= 0 || body.limit > 100) {
      next(apiError.badRequest("Limit for per page is max 100 min 1"));
      return;
    }
    // currently returns feedback that are latest
    let last_time = body.last_time,
      feedbacks;
    let feddbackFindArgumentObj = { product_id: body.product_id };
    if (last_time) {
      feddbackFindArgumentObj.created_at = { $lt: last_time };
    }
    feedbacks = await Feedbacks.find(feddbackFindArgumentObj)
      .sort({ created_at: -1 })
      .limit(limit);
    if (feedbacks.length == 0 || !feedbacks) {
      next(apiError.badRequest("Cannot found feedbacks"));
      return;
    }
    last_time = feedbacks[feedbacks.length - 1].created_at;
    res.status(200).json({
      feedbacks,
      length: feedbacks.length,
      last_time,
    });
  } catch (error) {
    next(apiError.interServerError(error.message));
    return;
  }
});

/**
 * @param {number} stars - amount of star on a product user gave 1-5
 * @param {string} product_id - product id
 * @param {string} [feedback=''] - written feedback of user on a product
 */
router.post(
  "/create",
  authenticateUser,
  CheckIfItemBought,
  async (req, res, next) => {
    const body = req.body;
    body.stars = convertToInt(body.stars);
    const session = await mongoose.startSession();
    if (body.stars && (body.stars > 5 || body.stars < 1)) {
      next(apiError.badRequest("Stars atleast must be 1 or max 5"));
      return;
    }

    try {
      session.startTransaction();
      const product = await Products.findById(body.product_id);
      let feedback = await Feedbacks.findOne({
        product_id: body.product_id,
        user_id: body.user_id,
      });

      if (!product) {
        next(apiError.badRequest("Cannot found product with specified id"));
        return;
      }

      if (!feedback) {
        if (!body.stars) {
          // if hasn't gave feedback yet giving stars is required!
          next(apiError.badRequest("Please provide stars"));
          return;
        }
        product.total_stars += body.stars;
      }

      if (feedback && body.stars) {
        // if feedback gave already and update want to update stars
        if (feedback.stars <= 1 && body.stars <= 1) {
          next(apiError.badRequest("Cannot update stars less than 1"));
          return;
        }
        product.total_stars += body.stars - feedback.stars;
        feedback.stars = body.stars ? body.stars : feedback.stars;
      }

      if (feedback) {
        feedback.feedback = body.feedback
          ? body.feedback
          : feedback.feedback
          ? feedback.feedback
          : "";
      }

      product.total_reviews += feedback ? 0 : 1;
      product.average_review = (
        (product.total_stars / (product.total_reviews * 5)) *
        5
      ).toFixed(1);

      if (!feedback) {
        feedback = new Feedbacks({
          _id: mongoose.Types.ObjectId(),
          product_id: product._id,
          stars: body.stars,
          feedback: body.feedback ? body.feedback : "",
          user_id: body.user_id,
          created_at: Date.now(),
        });
      }

      await product.save({ session });
      await feedback.save({ session });
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
 * @param {string} product_id - product id
 */
router.post(
  "/user/:productId",
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
 * @param {string} product_id - product id
 */
router.post("/remove", authenticateUser, async (req, res, next) => {
  const body = req.body;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const product = await Products.findById(body.product_id);
    const deletedFeedback = await Feedbacks.findOneAndDelete({
      product_id: body.product_id,
      user_id: body.user_id,
    }).session(session);
    product.average_review =
      ((product.total_stars - deletedFeedback.stars) /
        ((product.total_reviews - 1) * 5)) *
        5 || 0;
    product.average_review.toFixed(1);
    product.total_stars -= deletedFeedback.stars;
    product.total_reviews -= 1;
    if (!deletedFeedback) {
      next(
        apiError.notFound("Cannot found feedback to delete with specified id")
      );
      return;
    }
    await product.save({ session });
    await session.commitTransaction();
    res.status(200).json({
      message: "Removed successfully",
    });
    return;
  } catch (error) {
    await session.abortTransaction();
    next(apiError.interServerError(error.message));
    return;
  } finally {
    session.endSession();
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
  next(apiError.badRequest("Item not bought"));
  return;
}

module.exports = router;
