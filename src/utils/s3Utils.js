const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const path = require("path");
const { prisma } = require("../config/database");

/**
 * Get configured S3 client for a travel agency
 */
const getS3Client = async () => {
  const travelAgencyId = 'bb93d353-9313-46c6-8e5d-71b9471b6691';
  const settings = await prisma.travelAgencySettings.findUnique({
    where: { travelAgencyId },
  });

  if (!settings || !settings.s3_access_key_id) {
    throw new Error("S3 settings not configured for this travel agency.");
  }

  const client = new S3Client({
    region: (settings.s3_region || "ap-south-1").toString().trim(),
    credentials: {
      accessKeyId: settings.s3_access_key_id.toString().trim(),
      secretAccessKey: settings.s3_secret_access_key.toString().trim(),
    },
  });

  return {
    client,
    bucketName: settings.s3_bucket_name.toString().trim(),
    region: (settings.s3_region || "ap-south-1").toString().trim(),
    baseUrl: settings.s3_base_url || ""
  };
};

/**
 * Reusable function to upload file to S3
 */
const uploadToS3 = async (file, fileName) => {
  const { client, bucketName, region, baseUrl } = await getS3Client(); 
  // Handle s3_base_url (If it exists, we extract the folder path)
  let cleanKey = fileName;
  if (baseUrl && baseUrl.includes('s3://')) { 
      const urlParts = baseUrl.replace('s3://', '').split('/');
      urlParts.shift();  
      const folderPath = urlParts.filter(p => p).join('/');
      if (folderPath) {
          cleanKey = `${folderPath}/${fileName}`;
      }
  }

  const params = {
    Bucket: bucketName,
    Key: cleanKey,
    Body: file.data || file.buffer,
    ContentType: file.mimetype,
  };

  await client.send(new PutObjectCommand(params));

  return {
    key: cleanKey,
    url: `https://${bucketName}.s3.${region}.amazonaws.com/${cleanKey}`,
  };
};

/**
 * Generate signed URL for downloading
 */
const generateDownloadURL = async (key) => {
  const { client, bucketName } = await getS3Client();

  const params = {
    Bucket: bucketName,
    Key: key,
  };

  return await getSignedUrl(
    client,
    new GetObjectCommand(params),
    { expiresIn: 3600 }
  );
};

module.exports = {
  uploadToS3,
  generateDownloadURL,
};
