const mongoose = require("mongoose");
const orderSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  user_id: {
    type: String,
    required: true,
  },
  address: {
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zip: {
      type: Number,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    street: {
      type: String,
      required: true,
    },
  },
  tel: {
    type: String,
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
  transaction_id: { type: String, required: true },
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
});

module.exports = mongoose.model("Order", orderSchema);

// payment_status codes
// 1 = successfull
// 2 = pending
// 3 = failed
// 4 = refund_started
// 5 = refunded
// 6 = refund failed
