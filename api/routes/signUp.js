const router = require("express").Router();
const mongoose = require("mongoose");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const apiError = require("../error-handler/apiErrors");
const sha256 = require("js-sha256").sha256;

router.post("/", async (req, res, next) => {
  const body = req.body;
  if (!validateEmail(body.email)) {
    next(apiError.badRequest("Enter valid email"));
    return;
  }
  if (!validatePassword(body.password)) {
    next(apiError.badRequest("Enter strong password"));
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
        process.env.JWT_ACCESS_TOKEN_SECERET
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
  const emailRegEx = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return emailRegEx.test(email);
}
function validatePassword(password) {
  var passwordRegEx = /(?=^.{12,}$)(?=.*\d)(?=.*[!@#$%^&*]+)(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;
  return passwordRegEx.test(password);
  // at least 1 uppercase letter
  // at least 1 special character
  // at least 1 number
  // at least 12 character
}

module.exports = router;
