const mongoose = require("mongoose");
const passwordResetTokenSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  token: {
    type: String,
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

module.exports = mongoose.model("PasswordResetToken", passwordResetTokenSchema);
