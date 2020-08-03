const apiError = require("./apiErrors");

function errorHandler(err, req, res, next) {
  if (err instanceof apiError) {
    res.status(err.status).json({
      err: err.message,
    });
    return;
  }
  res.status(500).json({
    err: "Something went wrong",
  });
}

module.exports = errorHandler;

