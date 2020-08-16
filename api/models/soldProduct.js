const mongoose = require("mongoose");
const soldProductSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  product_id: {
    type: String,
    required: true,
  },
  ordered_at: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("SoldProduct", soldProductSchema);
