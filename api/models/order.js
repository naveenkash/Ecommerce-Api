const mongoose = require("mongoose");
const orderSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  user_id: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  cart_id: {
    type: String,
    required: true,
  },
  total_price: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("Order", orderSchema);
