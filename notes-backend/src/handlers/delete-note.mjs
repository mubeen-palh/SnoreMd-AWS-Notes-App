import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.TABLE_NAME;

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*"
};

export const handler = async (event) => {
  try {
    const patientId = event.pathParameters.patientId;
    const noteId = event.pathParameters.noteId;

    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { patientId, noteId },
        UpdateExpression: "SET deletedAt = :now",
        ConditionExpression: "attribute_exists(noteId) AND attribute_not_exists(deletedAt)",
        ExpressionAttributeValues: { ":now": new Date().toISOString() }
      })
    );

    return { statusCode: 204, headers: CORS, body: "" };
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 404,
        headers: CORS,
        body: JSON.stringify({ message: "Note not found or already deleted" })
      };
    }
    console.log("ERROR:", err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ message: err.message })
    };
  }
};
