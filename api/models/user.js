const mongoose = require("mongoose");
const userSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  cart_id: {
    type: String,
    required: false,
  },
  img: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("User", userSchema);
