const router = require("express").Router();
const mongoose = require("mongoose");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const apiError = require("../error-handler/apiErrors");
const sha256 = require("js-sha256").sha256;
const formidable = require("formidable");
const uploadToAWS = require("../helper-methods/uploadToAws");
const checkFileType = require("../helper-methods/checkFileType.js");

/**
 * @param {formData}
 * @param {formData name}
 * @param {formData lastname}
 * @param {formData password}
 * @param {formData email}
 * @param {formData image file->key file->value}
 */
router.post("/", async (req, res, next) => {
  const form = new formidable.IncomingForm({ multiples: false });
  form.parse(req, async (error, fields, files) => {
    try {
      if (error) {
        next(apiError.interServerError(error.message));
        return;
      }

      if (files.file && !checkFileType.isFileValid(files.file)) {
        next(apiError.badRequest("File type not supported"));
        return;
      }

      if (!validateEmail(fields.email)) {
        next(apiError.badRequest("Enter valid email"));
        return;
      }
      if (!validatePassword(fields.password)) {
        next(apiError.badRequest("Enter strong password"));
        return;
      }
      const userFound = await User.findOne({ email: fields.email }); // query to check if user with email already exist
      if (!userFound) {
        let img;
        if (files.file) {
          img = await uploadToAWS("user-images", files.file);
        }
        const user = new User({
          _id: mongoose.Types.ObjectId(),
          name: fields.name,
          lastname: fields.lastname,
          email: fields.email,
          password: sha256(fields.password),
          img: img != null ? img.Location : process.env.DEFAULT_IMG,
        });

        const new_user = await user.save();
        const token = jwt.sign(
          {
            user_id: new_user._id,
            name: new_user.name,
            lastname: new_user.lastname,
            email: new_user.email,
            img: new_user.img,
          },
          process.env.JWT_ACCESS_TOKEN_SECERET
        );
        res.status(201).json({
          user: {
            user_id: new_user._id,
            name: new_user.name,
            lastname: new_user.lastname,
            email: new_user.email,
            img: new_user.img,
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
