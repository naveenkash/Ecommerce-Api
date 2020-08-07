function isFileValid(file) {
  if (file == null || !fileFilter(file) || file.size <= 0) {
    return false;
  }
  return true;
}

function areFilesValid(files) {
  var allFilesValid = true;
  if (!Array.isArray(files)) {
    return isFileValid(files);
  }
  files.forEach((file) => {
    if (!fileFilter(file)) {
      allFilesValid = false;
      return allFilesValid;
    }
  });
  return allFilesValid;
}
function fileFilter(file) {
  const allowedTypes = ["image/jpg", "image/jpeg", "image/png"];
  if (!allowedTypes.includes(file.type)) {
    return false;
  }
  return true;
}

module.exports = { isFileValid, areFilesValid };
