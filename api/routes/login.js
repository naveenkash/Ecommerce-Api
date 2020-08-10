const router = require("express").Router();
const Users = require("../models/user");
const apiError = require("../error-handler/apiErrors");
const sha256 = require("js-sha256").sha256;
const jwt = require("jsonwebtoken");

router.get("/local", async (req, res, next) => {
  const body = req.body;
  const typedPassword = sha256(body.password.trim());
  try {
    const user = await Users.findOne({ email: body.email });
    if (user) {
      const savedPassword = user.password;
      if (typedPassword == savedPassword) {
        let userObj = {
          user_id: user._id,
          name: user.name,
          lastname: user.lastname,
          email: user.email,
          created_at: user.created_at,
          display_name: user.display_name,
          img: user.img,
        };

        const token = jwt.sign(
          {
            user_id: new_user._id,
            name: new_user.name,
            lastname: new_user.lastname,
            email: new_user.email,
            img: new_user.img,
            created_at: new_user.created_at,
            display_name: new_user.display_name,
          },
          process.env.JWT_ACCESS_TOKEN_SECERET
        );

        res.status(200).json({
          user: userObj,
          token,
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
