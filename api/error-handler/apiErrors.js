class ApiError {
  constructor(status, message) {
    this.status = status;
    this.message = message;
  }
  static interServerError(msg) {
    return new ApiError(500, msg);
  }
  static badRequest(msg) {
    return new ApiError(400, msg);
  }
  static notFound(msg) {
    return new ApiError(404, msg);
  }
  static forbidden(msg) {
    return new ApiError(403, msg);
  }
  static paymentRequierd(msg) {
    return new ApiError(402, msg);
  }
  static unAuthorized(msg) {
    return new ApiError(401, msg);
  }
}

module.exports = ApiError;
