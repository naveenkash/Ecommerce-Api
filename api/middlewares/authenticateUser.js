const jwt = require("jsonwebtoken");
const apiError = require("../error-handler/apiErrors");

/**
 * @param {bearer token}
 */
function authenticateUser(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) {
    res.status(401).json({ message: "No token found" });
    return;
  }
  jwt.verify(
    token,
    process.env.JWT_ACCESS_TOKEN_SECERET,
    (err, decodedToken) => {
      if (err) {
        next(apiError.unAuthorized(err.message));
        return;
      }
      req.body.user_id = decodedToken.user_id;
      next();
    }
  );
}
module.exports = authenticateUser;
