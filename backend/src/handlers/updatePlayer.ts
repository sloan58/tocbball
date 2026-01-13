import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { dynamo, TABLE_NAME } from "../util/dynamodb";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { success, error } from "../util/response";
import { validatePinHeader } from "../util/validate-pin-header";
import { Player, DynamoItem } from "@tocbball/shared";

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const teamId = event.pathParameters?.teamId;
  const playerId = event.pathParameters?.playerId;
  if (!teamId || !playerId || !event.body) {
    return error("Team ID, player ID, and request body required", 400);
  }

  const isValidPin = await validatePinHeader(event, teamId);
  if (!isValidPin) {
    return error("Invalid or missing admin PIN", 401);
  }

  try {
    // Get existing player
    const existing = await dynamo.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: teamId,
          SK: `PLAYER#${playerId}`,
        },
      })
    );

    if (!existing.Item) {
      return error("Player not found", 404);
    }

    const updates = JSON.parse(event.body);
    const currentPlayer = existing.Item.data as Player;

    const player: Player = {
      ...currentPlayer,
      ...updates,
      id: playerId,
      teamId, // Prevent team ID changes
    };

    const item: DynamoItem = {
      ...existing.Item as DynamoItem,
      data: player,
    };

    await dynamo.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );

    return success(player);
  } catch (err) {
    console.error("Error updating player:", err);
    return error("Internal server error", 500);
  }
}
