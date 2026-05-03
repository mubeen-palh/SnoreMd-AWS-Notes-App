import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({
  region: "ap-south-1"
});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE = process.env.TABLE_NAME;

export const handler = async (event) => {
  try {
    const patientId = event.pathParameters.patientId;
    const body = JSON.parse(event.body || "{}");

    // Mocked identity — see README "Authentication (mocked)".
    // Replace with verified JWT claims (Cognito / JWKS) in production.
    const authorId = event.headers?.["x-user-id"] || event.headers?.["X-User-Id"] || "user1";
    const clinicId = event.headers?.["x-clinic-id"] || event.headers?.["X-Clinic-Id"] || "clinic1";

    if (!body.content) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "content required" })
      };
    }

    const note = {
      patientId,
      noteId: uuidv4(),
      content: body.content,
      tags: body.tags || [],
      studyDate: body.studyDate || null,
      attachmentKey: body.attachmentKey || null,
      version: 1,
      authorId,
      clinicId,
      createdAt: new Date().toISOString()
    };

    await ddb.send(
      new PutCommand({
        TableName: TABLE,
        Item: note
      })
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(note)
    };

  } catch (err) {
    console.log("ERROR:", err);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: err.message })
    };
  }
};
