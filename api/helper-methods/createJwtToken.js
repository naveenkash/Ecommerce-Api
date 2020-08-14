const jwt = require("jsonwebtoken");
function createJwtToken(data) {
  const token = jwt.sign(data, process.env.JWT_ACCESS_TOKEN_SECERET, {
    expiresIn: "7d", // expires in 7 days
  });
  return token;
}

module.exports = createJwtToken;
