const { S3Client } = require("@aws-sdk/client-s3");

function createS3Client(settings) {
  return new S3Client({
    region: settings.s3_region,
    credentials: {
      accessKeyId: settings.s3_access_key_id,
      secretAccessKey: settings.s3_secret_access_key,
    },
    endpoint: settings.storage_endpoint || undefined,
    forcePathStyle: !!settings.storage_endpoint,
  });
}

module.exports = { createS3Client };