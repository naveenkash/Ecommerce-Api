const mongoose = require("mongoose");
const orderSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  user_id: {
    type: String,
    required: true,
  },
  address: {
    line1: {
      type: String,
      trim: true,
      required: true,
    },
    line2: {
      type: String,
      trim: true,
    },
    landmark: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
      required: true,
    },
    state: {
      type: String,
      trim: true,
      required: true,
    },
    zip: {
      type: Number,
      trim: true,
      required: true,
    },
    country: {
      type: String,
      trim: true,
      required: true,
    },
    street: {
      type: String,
      trim: true,
      required: true,
    },
  },
  tel: {
    type: String,
    trim: true,
    required: true,
  },
  cart_id: {
    type: String,
    required: true,
  },
  payment_status: {
    type: Number,
    required: true,
  },
  transaction_id: {
    type: String,
    required: true,
  },
  receipt_url: {
    type: String,
    required: false,
  },
  total_price: {
    type: Number,
    required: true,
  },
  ordered_at: {
    type: Number,
    required: true,
  },
  order_status: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("Order", orderSchema);

// payment_status codes
// 1 = successfull
// 2 = pending
// 3 = failed
// 4 = refund_started
// 5 = refunded
// 6 = refund failed

// order_status codes
// 1 = received
// 2 = delivered
// 3 = rejected
// 4 = dispatched
// 5 = created
