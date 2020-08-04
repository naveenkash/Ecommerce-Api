module.exports = function randomId() {
  return require("crypto").randomBytes(20).toString("hex");
};
