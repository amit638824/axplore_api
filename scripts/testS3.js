const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
require("dotenv").config();

/**
 * S3 SETUP DEBUGGER SCRIPT
 * Run this with: node scripts/testS3.js
 */

const debugS3 = async () => {
    console.log("--- S3 SETUP DEBUGGER START ---");
    
    // 1. YOUR CURRENT CREDENTIALS
    const config = {
        region: "ap-south-1", // MUMBAI
        credentials: {
            accessKeyId: "AKIAW3MEEWY3CLP4AMNI",
            secretAccessKey: "BFgQGNRMmq0zP0u1G7eHQAqPLizNpTLZCTbCf5mCrbdH", // This is where the signature issue usually is
        },
    };

    console.log(`Checking Access Key: ${config.credentials.accessKeyId}...`);
    console.log(`Checking Region: ${config.region}...`);
    console.log(`Checking Bucket: alphadroid-public...`);

    const client = new S3Client(config);

    try {
        console.log("Step 1: Attempting to list objects in bucket...");
        const command = new ListObjectsV2Command({
            Bucket: "alphadroid-public",
            MaxKeys: 1
        });
        
        await client.send(command);
        console.log("✅ SUCCESS! Your S3 credentials and bucket name are correct.");
        
    } catch (error) {
        console.error("❌ ERROR DETECTED:");
        console.error(`Name: ${error.name}`);
        console.error(`Message: ${error.message}`);
        
        if (error.name === "SignatureDoesNotMatch") {
            console.log("--------------------------------------------------");
            console.log("TROUBLESHOOTING: SIGNATURE DOES NOT MATCH");
            console.log("Your Secret Access Key is INCORRECT.");
            console.log("Most likely, you are using your 'SES SMTP Password' here.");
            console.log("AWS S3 requires the 'IAM Secret Access Key', NOT the SMTP password.");
            console.log("Please generate a NEW IAM Access Key pair in the AWS console.");
            console.log("--------------------------------------------------");
        } else if (error.name === "NoSuchBucket") {
            console.log("TROUBLESHOOTING: NO SUCH BUCKET");
            console.log("Check if 'alphadroid-public' is the correct spelling.");
            console.log("Check if the bucket actually exists in 'ap-south-1'.");
        } else if (error.name === "InvalidAccessKeyId") {
            console.log("TROUBLESHOOTING: INVALID ACCESS KEY ID");
            console.log("The Access Key ID itself is wrong or has been deleted.");
        } else if (error.name === "AccessDenied") {
            console.log("TROUBLESHOOTING: ACCESS DENIED");
            console.log("Your keys are correct, but the IAM user lacks permissions for this bucket.");
            console.log("Add 'AmazonS3FullAccess' policy to the user in IAM console.");
        }
    }
};

debugS3();
