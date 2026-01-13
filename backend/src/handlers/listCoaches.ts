import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { dynamo, TABLE_NAME } from "../util/dynamodb";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { success, error } from "../util/response";

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const teamId = event.pathParameters?.teamId;
  if (!teamId) {
    return error("Team ID required", 400);
  }

  try {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": teamId,
          ":sk": "COACH#",
        },
      })
    );

    const coaches = (result.Items || []).map((item) => item.data);
    return success(coaches);
  } catch (err) {
    console.error("Error listing coaches:", err);
    return error("Internal server error", 500);
  }
}
