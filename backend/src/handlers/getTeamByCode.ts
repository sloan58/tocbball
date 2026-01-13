import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { dynamo, TABLE_NAME } from "../util/dynamodb";
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { success, error } from "../util/response";

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const code = event.pathParameters?.code;
  if (!code) {
    return error("Team code required", 400);
  }

  try {
    // Query by team code via GSI1
    const result = await dynamo.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: {
          ":pk": `TEAM_CODE#${code}`,
        },
        Limit: 1,
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return error("Team not found", 404);
    }

    const team = result.Items[0].data as any;
    // Don't return adminPin in GET requests (security)
    const { adminPin, ...teamWithoutPin } = team;
    return success(teamWithoutPin);
  } catch (err) {
    console.error("Error getting team:", err);
    return error("Internal server error", 500);
  }
}
