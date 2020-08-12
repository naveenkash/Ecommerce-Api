const mongoose = require("mongoose");
const userSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: {
    type: String,
    trim: true,
    required: true,
  },
  lastname: {
    type: String,
    trim: true,
    required: true,
  },
  email: {
    type: String,
    trim: true,
    required: true,
  },
  password: {
    type: String,
    trim: true,
    required: true,
  },
  cart_id: {
    type: String,
    required: false,
  },
  img: {
    type: Object,
    url: {
      type: String,
    },
    key: {
      type: String,
    },
  },
  created_at: {
    type: Number,
    required: true,
  },
  display_name: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("User", userSchema);
