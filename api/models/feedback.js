const mongoose = require("mongoose");
const feedbackSchema = mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  product_id: {
    type: String,
    required: true,
  },
  stars: {
    type: Number,
    required: true,
  },
  feedback: String,
  user_id: {
    type: String,
    required: true,
  },
  created_at: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("Feedback", feedbackSchema);
