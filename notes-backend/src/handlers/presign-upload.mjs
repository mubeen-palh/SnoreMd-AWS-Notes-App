import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({ region: "ap-south-1" });
const BUCKET = process.env.ATTACHMENTS_BUCKET;

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*"
};

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const filename = (body.filename || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
    const contentType = body.contentType || "application/octet-stream";

    const key = `attachments/${uuidv4()}-${filename}`;

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType
      }),
      { expiresIn: 300 }
    );

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ uploadUrl, key })
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
