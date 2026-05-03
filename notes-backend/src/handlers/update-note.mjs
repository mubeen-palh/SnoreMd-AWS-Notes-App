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
    const body = JSON.parse(event.body || "{}");

    const ifMatch = event.headers?.["if-match"] ?? event.headers?.["If-Match"];
    const expectedVersion = ifMatch !== undefined ? Number(ifMatch) : Number(body.version);

    if (Number.isNaN(expectedVersion)) {
      return {
        statusCode: 428,
        headers: CORS,
        body: JSON.stringify({ message: "version required (If-Match header or body.version)" })
      };
    }

    const sets = ["version = :next", "updatedAt = :updatedAt"];
    const names = {};
    const values = {
      ":expected": expectedVersion,
      ":next": expectedVersion + 1,
      ":updatedAt": new Date().toISOString()
    };

    if (body.content !== undefined) {
      sets.push("#content = :content");
      names["#content"] = "content";
      values[":content"] = body.content;
    }
    if (body.tags !== undefined) {
      sets.push("tags = :tags");
      values[":tags"] = body.tags;
    }
    if (body.studyDate !== undefined) {
      sets.push("studyDate = :studyDate");
      values[":studyDate"] = body.studyDate;
    }
    if (body.attachmentKey !== undefined) {
      sets.push("attachmentKey = :attachmentKey");
      values[":attachmentKey"] = body.attachmentKey;
    }

    const result = await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { patientId, noteId },
        UpdateExpression: "SET " + sets.join(", "),
        ConditionExpression: "version = :expected AND attribute_not_exists(deletedAt)",
        ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW"
      })
    );

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify(result.Attributes)
    };
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 412,
        headers: CORS,
        body: JSON.stringify({ message: "Version mismatch or note deleted" })
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
