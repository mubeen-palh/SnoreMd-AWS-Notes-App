import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

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

    const result = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { patientId, noteId }
      })
    );

    if (!result.Item || result.Item.deletedAt) {
      return {
        statusCode: 404,
        headers: CORS,
        body: JSON.stringify({ message: "Not found" })
      };
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify(result.Item)
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
