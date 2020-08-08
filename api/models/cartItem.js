const mongoose = require("mongoose");
const cartItemSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  cart_id: {
    type: String,
    required: true,
  },
  product_id: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  checkout: {
    type: Boolean,
    required: true,
  },
  user_id: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("cartItem", cartItemSchema);
