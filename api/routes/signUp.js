const router = require("express").Router();
const mongoose = require("mongoose");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const apiError = require("../error-handler/apiErrors");
const sha256 = require("js-sha256").sha256;

router.post("/", async (req, res) => {
  const body = req.body;
  if (!validateEmail(body.email)) {
    next(apiError.badRequest("Enter valid email"));
    return;
  }
  try {
    const userFound = await User.findOne({ email: body.email }); // query to check if user with email already exist
    if (!userFound) {
      const user = new User({
        _id: mongoose.Types.ObjectId(),
        name: body.name,
        lastname: body.lastname,
        email: body.email,
        password: sha256(body.password),
      });

      const new_user = await user.save();
      const token = jwt.sign(
        {
          user_id: new_user._id,
          name: new_user.name,
          lastname: new_user.lastname,
          email: new_user.email,
        },
        process.env.ACCESS_TOKEN_SECERET
      );
      res.status(201).json({
        user: {
          user_id: new_user._id,
          name: new_user.name,
          lastname: new_user.lastname,
          email: new_user.email,
        },
        token,
      });
    } else {
      next(apiError.badRequest("User already exist with that email"));
      return;
    }
  } catch (error) {
    next(apiError.interServerError(error.message));
    return;
  }
});

function validateEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

module.exports = router;
