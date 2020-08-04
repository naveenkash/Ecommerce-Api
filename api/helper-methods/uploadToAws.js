const AWS = require("aws-sdk");
const fs = require("fs");
const randomId = require("./randomId");
const BUCKET = "your-bucket-name"; // bucket name
const REGION = "bucket-region"; // bucket region
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: REGION,
});
const s3 = new AWS.S3();

async function uploadToAWS(file) {
  // Read content from the file
  const fileData = await new Promise((resolve, reject) => {
    fs.readFile(file.path, function (err, data) {
      err == null ? resolve(data) : reject(err);
    });
  });

  let months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  let d = new Date();
  let folderName = `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;
  // Setting up S3 upload parameters
  const params = {
    Bucket: BUCKET,
    Key: `${folderName}/${randomId()}.${file.type.split("/")[1]}`, // folder/filename.ext you want to save as in S3
    Body: fileData,
    ACL: "public-read",
  };

  // Uploading files to the bucket
  const data = await new Promise((resolve, reject) => {
    s3.upload(params, function (err, data) {
      err == null ? resolve(data) : reject(err);
    });
  });
  return data;
}

module.exports = uploadToAWS;
