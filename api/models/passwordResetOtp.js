const mongoose = require("mongoose");
const otpSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  otp: {
    type: Number,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  valid_till: {
    type: Number,
    required: true,
  },
  created_at: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("PasswordResetOtp", otpSchema);
