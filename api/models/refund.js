const mongoose = require("mongoose");
const refundSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  refund_id: {
    type: String,
    default: null,
  },
  transaction_id: {
    type: String,
    required: true,
  },
  order_id: {
    type: String,
    required: true,
  },
  user_id: {
    type: String,
    required: true,
  },
  created_at: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("Refund", refundSchema);
