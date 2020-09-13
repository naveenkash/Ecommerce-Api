const router = require("express").Router();
const apiError = require("../error-handler/apiErrors");
const Users = require("../models/user");
const PasswordResetOtps = require("../models/PasswordResetOtp");
const PasswordResetTokens = require("../models/passwordResetToken");
const sendEmail = require("../helper-methods/sendEmail");
const mongoose = require("mongoose");
const sha256 = require("js-sha256").sha256;
const validatePassword = require("../helper-methods/validatePassword");
const rateLimit = require("express-rate-limit");
const MongoStore = require("rate-limit-mongo");

/**
 * @param {string} email - email to send OTP
 */
router.post("/sendresetotp", async (req, res, next) => {
  const body = req.body;
  let { email } = body;

  try {
    const user = await Users.findOne({ email });
    if (!user) {
      next(apiError.notFound("User with this does not exist"));
      return;
    }
    const OTP = generateSixDigitOtp();
    const otpDoc = new PasswordResetOtps({
      _id: mongoose.Types.ObjectId(),
      otp: OTP,
      email: email,
      created_at: Date.now(),
      valid_till: Date.now() + 600000,
    });
    await otpDoc.save();
    await sendEmail(
      email,
      from, // enter email to sent from
      subject, // enter subject of the email
      text, // enter text of the email
      `Hi ${user.display_name},
        Your One time password is (OTP) <strong>${OTP}</strong> for resetting your password
        This OTP will expire in 10 minutes.`
    );
    res.status(200).json({
      message: "OTP sent!",
    });
  } catch (error) {
    next(apiError.interServerError(error.message));
    return;
  }
});

// limit verify otp request
const verifyOtpRequestLimiter = rateLimit({
  store: new MongoStore({
    uri: process.env.MONGO_URI,
    collectionName: "verifyotprequestlimits",
    expireTimeMs: generateExpireTimeMs(600000, 86400000), // generate time between 10 minutes - 1 day in milliseconds
  }),
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10,
  handler: function (req, res, next) {
    next(
      apiError.forbidden(
        `Too many attempts from this ip, Try again after some time`
      )
    );
    return;
  },
});

/**
 * @param {string} email - email the OTP was sent to
 * @param {number} otp - OTP to verify
 */
router.post(
  "/verifyresetotp",
  verifyOtpRequestLimiter,
  async (req, res, next) => {
    const body = req.body;
    const { email, otp } = body;
    if (!otp) {
      next(apiError.badRequest("OTP not found"));
      return;
    } else if (!email) {
      next(apiError.badRequest("Email not found"));
      return;
    }
    if (!Number.isInteger(parseInt(otp)) && otp < 100000) {
      next(apiError.badRequest("OTP not valid"));
      return;
    }
    try {
      const savedOtp = await PasswordResetOtps.findOne({
        email,
        otp,
        valid_till: { $gte: Date.now() },
      });
      if (!savedOtp) {
        next(apiError.notFound("OTP verification failed"));
        return;
      }
      const token = getToken(64);
      const savedToken = new PasswordResetTokens({
        _id: mongoose.Types.ObjectId(),
        token,
        email,
        created_at: Date.now(),
        valid_till: Date.now() + 600000,
      });
      await savedToken.save();
      res.status(200).json({
        token,
      });
    } catch (error) {
      next(apiError.interServerError(error.message));
      return;
    }
  }
);

/**
 * @param {string} token - received after verifying OTP
 * @param {string} password - password to change to
 * @param {string} email - email of the account password being changed
 */
router.post("/reset", async (req, res, next) => {
  const body = req.body;
  const { token, password, email } = body;

  if (!token) {
    next(apiError.forbidden("Token not present"));
    return;
  }
  if (!email) {
    next(apiError.forbidden("Email not present"));
    return;
  }

  if (!validatePassword(password)) {
    next(apiError.forbidden("Enter strong password"));
    return;
  }
  try {
    const savedToken = await PasswordResetTokens.findOne({
      token,
      email,
      valid_till: { $gte: Date.now() },
    });
    if (!savedToken) {
      try {
        await sendEmail(
          email,
          from, // enter email to sent from
          subject, // enter subject of the email
          text, // enter text of the email
          `There was a attempt in changing your password`
        );
      } catch (error) {}
      next(apiError.forbidden("Token not valid"));
      return;
    }
    const user = await Users.findOneAndUpdate(
      { email },
      {
        password: sha256(password.trim()),
      }
    );
    try {
      await sendEmail(
        email,
        from, // enter email to sent from
        subject, // enter subject of the email
        text, // enter text of the email
        `Hi ${user.display_name},
        Your password has been changed successfully`
      );
    } catch (error) {}

    res.status(200).json({
      message: "Password updated!",
    });
  } catch (error) {
    next(apiError.interServerError(error.message));
    return;
  }
});

function generateSixDigitOtp() {
  return Math.floor(100000 + Math.random() * 899999);
}

function generateExpireTimeMs(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function generateToken(length) {
  var chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890_&-";
  var token = "";
  for (var i = 0; i < length; i++) {
    var index = (Math.random() * (chars.length - 1)).toFixed(0);
    token += chars.charAt(index);
  }
  return token;
}
function getToken(length) {
  const token = `tk_${generateToken(length)}_${generateToken(
    length
  )}_${generateToken(length)}`;
  return token;
}

module.exports = router;
