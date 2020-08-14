const router = require("express").Router();
const Users = require("../models/user");
const apiError = require("../error-handler/apiErrors");
const sha256 = require("js-sha256").sha256;
const createJwtToken = require("../helper-methods/createJwtToken");

router.post("/local", async (req, res, next) => {
  const body = req.body;
  if (!body.email || !body.password) {
    next(apiError.badRequest("Email or Password required"));
    return;
  }
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
        const token = createJwtToken(userObj);
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
