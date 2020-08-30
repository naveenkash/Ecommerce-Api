const router = require("express").Router();
const mongoose = require("mongoose");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const apiError = require("../error-handler/apiErrors");
const sha256 = require("js-sha256").sha256;
const formidable = require("formidable");
const uploadToAWS = require("../helper-methods/uploadToAws");
const checkFileType = require("../helper-methods/checkFileType.js");
const validateEmail = require("../helper-methods/validateEmail");
const validatePassword = require("../helper-methods/validatePassword");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const createJwtToken = require("../helper-methods/createJwtToken");

/**
 * type formData
 * @param {string} name - user name
 * @param {string} lastname - user lastname
 * @param {string} password - user password
 * @param {string} email - user email
 * @param {image} file - user image
 */
router.post("/local", async (req, res, next) => {
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
        let img, imgObj;
        if (files.file) {
          img = await uploadToAWS("user-images", files.file);
          imgObj = {
            url: img.Location,
            key: img.Key,
          };
        }

        const user = new User({
          _id: mongoose.Types.ObjectId(),
          name: fields.name,
          lastname: fields.lastname,
          display_name: `${fields.name} ${fields.lastname}`,
          email: fields.email,
          password: sha256(fields.password.trim()),
          img: img != null ? imgObj : {},
          created_at: Date.now(),
        });

        const new_user = await user.save();
        const userObj = {
          user_id: new_user._id,
          name: new_user.name,
          lastname: new_user.lastname,
          email: new_user.email,
          img: new_user.img,
          created_at: new_user.created_at,
          display_name: new_user.display_name,
        };
        const token = createJwtToken(userObj);
        const msg = {
          to: new_user.email,
          from: "welcome-noreply@your-url.com",
          subject: "Subject of the email",
          text: "Text of the mail", // text should be plain version of html
          html: "Email template ex: <strong>Welcome</strong>",
        };
        let welcome_mail_sent = true;
        try {
          await sgMail.send(msg);
        } catch (err) {
          welcome_mail_sent = false;
        }
        res.status(201).json({
          user: userObj,
          token,
          welcome_mail_sent,
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

module.exports = router;
