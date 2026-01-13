import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { dynamo, TABLE_NAME } from "../util/dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { success, error } from "../util/response";

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const teamId = event.pathParameters?.teamId;
  const gameId = event.pathParameters?.gameId;
  if (!teamId || !gameId) {
    return error("Team ID and game ID required", 400);
  }

  try {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: teamId,
          SK: `GAME#${gameId}`,
        },
      })
    );

    if (!result.Item) {
      return error("Game not found", 404);
    }

    return success(result.Item.data);
  } catch (err) {
    console.error("Error getting game:", err);
    return error("Internal server error", 500);
  }
}
