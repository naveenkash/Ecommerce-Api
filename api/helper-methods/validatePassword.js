function validatePassword(password) {
  var passwordRegEx = /(?=^.{12,}$)(?=.*\d)(?=.*[!@#$%^&*]+)(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;
  return passwordRegEx.test(password);
  // at least 1 uppercase letter
  // at least 1 special character
  // at least 1 number
  // at least 12 character
}

module.exports = validatePassword;
