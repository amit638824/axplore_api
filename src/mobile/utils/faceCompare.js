const {
  RekognitionClient,
  CompareFacesCommand,
} = require("@aws-sdk/client-rekognition");

const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION,
});

exports.compareFaces = async (sourceImageUrl, targetImageUrl) => {
  const extractKeyFromUrl = (url) => {
    const bucketUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
    return url.replace(bucketUrl, "");
  };

  const sourceKey = extractKeyFromUrl(sourceImageUrl);
  const targetKey = extractKeyFromUrl(targetImageUrl);

  const command = new CompareFacesCommand({
    SourceImage: {
      S3Object: {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Name: sourceKey,
      },
    },
    TargetImage: {
      S3Object: {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Name: targetKey,
      },
    },
    SimilarityThreshold: 80,
  });

  const response = await rekognitionClient.send(command);

  const bestMatch = response.FaceMatches?.[0];

  return {
    matched: !!bestMatch,
    similarity: bestMatch?.Similarity || 0,
    faceMatches: response.FaceMatches || [],
    unmatchedFaces: response.UnmatchedFaces || [],
  };
};