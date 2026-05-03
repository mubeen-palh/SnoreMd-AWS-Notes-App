import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

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
    const qs = event.queryStringParameters || {};
    const limit = qs.limit ? Number(qs.limit) : 10;

    let exclusiveStartKey;
    if (qs.cursor) {
      try {
        exclusiveStartKey = JSON.parse(decodeURIComponent(qs.cursor));
      } catch {
        return {
          statusCode: 400,
          headers: CORS,
          body: JSON.stringify({ message: "invalid cursor" })
        };
      }
    }

    const filterParts = ["attribute_not_exists(deletedAt)"];
    const names = {};
    const values = { ":pid": patientId };

    if (qs.tag) {
      filterParts.push("contains(tags, :tag)");
      values[":tag"] = qs.tag;
    }
    if (qs.q) {
      filterParts.push("contains(#content, :q)");
      names["#content"] = "content";
      values[":q"] = qs.q;
    }
    if (qs.from) {
      filterParts.push("createdAt >= :from");
      values[":from"] = qs.from;
    }
    if (qs.to) {
      filterParts.push("createdAt <= :to");
      values[":to"] = qs.to;
    }

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "patientId = :pid",
        FilterExpression: filterParts.join(" AND "),
        ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
        ExpressionAttributeValues: values,
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey
      })
    );

    const items = (result.Items || []).sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || "")
    );

    const nextCursor = result.LastEvaluatedKey
      ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))
      : null;

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ items, nextCursor })
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
