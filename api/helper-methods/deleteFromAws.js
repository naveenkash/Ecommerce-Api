const AWS = require("aws-sdk");
const BUCKET = "your-bucket-name"; // bucket name
const REGION = "bucket-region"; // bucket region
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: REGION,
});
const s3 = new AWS.S3();
async function deleteFromAws(filename) {
  // Read content from the file
  try {
    // Setting up S3 delete parameters
    const params = {
      Bucket: BUCKET,
      Key: filename,
    };

    // deleting file from the bucket
    const data = await new Promise((resolve, reject) => {
      s3.deleteObject(params, function (err, data) {
        err == null ? resolve(data) : reject(err);
      });
    });
    return data;
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports = deleteFromAws;
