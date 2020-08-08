const router = require("express").Router();
const Users = require("../models/user");
const apiError = require("../error-handler/apiErrors");
const sha256 = require("js-sha256").sha256;

router.get("/local", async (req, res, next) => {
  const body = req.body;
  const typedPassword = sha256(body.password.trim());
  try {
    const user = await Users.findOne({ email: body.email });
    if (user) {
      const savedPassword = user.password;
      if (typedPassword == savedPassword) {
        let userObj = {
          _id: user._id,
          name: user.name,
          lastname: user.lastname,
          email: user.email,
          created_at: user.created_at,
          display_name: user.display_name,
          img: user.img,
        };
        res.status(200).json({
          user: userObj,
        });
        return;
      } else {
        next(apiError.forbidden("Wrong Password"));
        return;
      }
    } else {
      next(apiError.interServerError("No user found"));
      return;
    }
  } catch (error) {
    next(apiError.interServerError(error.message));
    return;
  }
});

module.exports = router;
