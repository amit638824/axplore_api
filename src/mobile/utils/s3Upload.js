const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { createS3Client } = require("../config/s3Client");

exports.uploadToS3old = async (
  file,
  settings,
  folder = "client/axplore/"
) => {
  const s3Client = createS3Client(settings);

  const fileName = `${Date.now()}-${file.originalname}`;
  const key = `${folder}${fileName}`;

  const command = new PutObjectCommand({
    Bucket: settings.s3_bucket_name,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);

  if (settings.s3_base_url) {
    return `${settings.s3_base_url}/${key}`;
  }

  return `https://${settings.s3_bucket_name}.s3.${settings.s3_region}.amazonaws.com/${key}`;
};
exports.uploadToS3 = async (
  file,
  settings,
  folder = "client/axplore/"
) => {
  const s3Client = createS3Client(settings);

  const fileName = `${Date.now()}-${file.originalname}`;
  let key = `${folder}${fileName}`.replace(/^\/+/, "");

  // If s3_base_url contains extra folder path like:
  // s3://alphadroid-public/client/axplore
  // then prepend that path to key
  if (
    settings.s3_base_url &&
    settings.s3_base_url.startsWith("s3://")
  ) {
    const rawBaseUrl = settings.s3_base_url.replace(/\/$/, "");
    const urlParts = rawBaseUrl.replace("s3://", "").split("/");

    // remove bucket name
    urlParts.shift();

    const folderPath = urlParts.filter(Boolean).join("/");

    if (folderPath) {
      key = `${folderPath}/${key}`.replace(
        /^client\/axplore\/client\/axplore\//,
        "client/axplore/"
      );
    }
  }

  const command = new PutObjectCommand({
    Bucket: settings.s3_bucket_name,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);

  const fileUrl = `https://${settings.s3_bucket_name}.s3.${settings.s3_region}.amazonaws.com/${key}`;

  return fileUrl;
};

exports.deleteFromS3 = async (fileUrl, settings) => {
  if (!fileUrl) return true;

  const s3Client = createS3Client(settings);

  let key = "";

  if (fileUrl.startsWith("s3://")) {
    key = fileUrl.replace(`s3://${settings.s3_bucket_name}/`, "");
  } else {
    const baseUrl = `https://${settings.s3_bucket_name}.s3.${settings.s3_region}.amazonaws.com/`;
    key = fileUrl.replace(baseUrl, "");
  }

  key = key.replace(
    /^client\/axplore\/client\/axplore\//,
    "client/axplore/"
  );

  const command = new DeleteObjectCommand({
    Bucket: settings.s3_bucket_name,
    Key: key,
  });

  await s3Client.send(command);

  return true;
};
exports.deleteFromS3old = async (fileUrl, settings) => {
  if (!fileUrl) return true;

  const s3Client = createS3Client(settings);

  let bucketUrl;

  if (settings.s3_base_url) {
    bucketUrl = `${settings.s3_base_url}/`;
  } else {
    bucketUrl = `https://${settings.s3_bucket_name}.s3.${settings.s3_region}.amazonaws.com/`;
  }

  const key = fileUrl.replace(bucketUrl, "");

  const command = new DeleteObjectCommand({
    Bucket: settings.s3_bucket_name,
    Key: key,
  });

  await s3Client.send(command);

  return true;
};