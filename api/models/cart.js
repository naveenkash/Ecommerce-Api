const mongoose = require("mongoose");
const cartSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  user_id: {
    type: String,
    required: true,
  },
  checkout: {
    type: Boolean,
    required: true,
  },
});

module.exports = mongoose.model("cart", cartSchema);
