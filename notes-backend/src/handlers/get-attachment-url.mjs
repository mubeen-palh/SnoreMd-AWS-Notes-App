import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: "ap-south-1" });
const BUCKET = process.env.ATTACHMENTS_BUCKET;

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*"
};

export const handler = async (event) => {
  try {
    const key = event.queryStringParameters?.key;
    if (!key) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ message: "key required" })
      };
    }

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn: 600 }
    );

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ url })
    };
  } catch (err) {
    console.log("ERROR:", err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ message: err.message })
    };
  }
};
