const router = require("express").Router();
const apiError = require("../error-handler/apiErrors");
const Users = require("../models/user");
const authenticateUser = require("../middlewares/authenticateUser");
const formidable = require("formidable");
const checkFileType = require("../helper-methods/checkFileType.js");
const validateEmail = require("../helper-methods/validateEmail");
const uploadToAWS = require("../helper-methods/uploadToAws");
const deleteFromAws = require("../helper-methods/deleteFromAws");

/**
 * type formData
 * @param {string} name - user name
 * @param {string} lastname - user lastname
 * @param {string} email - user email
 * @param {image} file - user image
 */
router.post("/update", authenticateUser, async (req, res, next) => {
  const body = req.body;
  const form = new formidable.IncomingForm({ multiples: false });

  const user = await Users.findById(body.user_id);
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
      if (fields.email) {
        const userWithEmail = await Users.findOne({
          email: fields.email,
          _id: { $ne: body.user_id },
        });
        if (userWithEmail) {
          next(apiError.badRequest("User with email already exist"));
          return;
        }
        if (!validateEmail(fields.email)) {
          next(apiError.badRequest("Enter valid email"));
          return;
        }
      }
      let img;
      let imgObj;
      if (files.file) {
        if (user.img.key) {
          await deleteFromAws(user.img.key);
        }
        img = await uploadToAWS("user-images", files.file);
        imgObj = {
          url: img.Location,
          key: img.Key,
        };
      }
      await Users.findByIdAndUpdate(body.user_id, {
        name: fields.name ? fields.name : user.name,
        lastname: fields.lastname ? fields.lastname : user.lastname,
        email: fields.email ? fields.email : user.email,
        img: img ? imgObj : user.img,
      });
      res.status(200).json({
        message: "updated!",
      });
    } catch (error) {
      next(apiError.interServerError(error.message));
      return;
    }
  });
});

module.exports = router;
