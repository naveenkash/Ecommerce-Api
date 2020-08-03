const mongoose = require("mongoose");
const transactionSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  transaction_id: {
    type: String,
    required: true,
  },
  cart_id: {
    type: String,
    required: true,
  },
  user_id: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Transaction", transactionSchema);
