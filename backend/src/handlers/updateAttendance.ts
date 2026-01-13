import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { dynamo, TABLE_NAME } from "../util/dynamodb";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { success, error } from "../util/response";
import { validatePinHeader } from "../util/validate-pin-header";
import { Game, DynamoItem } from "@tocbball/shared";

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const teamId = event.pathParameters?.teamId;
  const gameId = event.pathParameters?.gameId;
  if (!teamId || !gameId || !event.body) {
    return error("Team ID, game ID, and request body required", 400);
  }

  const isValidPin = await validatePinHeader(event, teamId);
  if (!isValidPin) {
    return error("Invalid or missing admin PIN", 401);
  }

  try {
    // Get existing game
    const existing = await dynamo.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: teamId,
          SK: `GAME#${gameId}`,
        },
      })
    );

    if (!existing.Item) {
      return error("Game not found", 404);
    }

    const { attendance } = JSON.parse(event.body);
    if (!Array.isArray(attendance)) {
      return error("Attendance must be an array", 400);
    }

    const currentGame = existing.Item.data as Game;
    const game: Game = {
      ...currentGame,
      attendance,
      updatedAt: new Date().toISOString(),
      // Clear schedule when attendance changes
      schedule: undefined,
    };

    const item: DynamoItem = {
      ...existing.Item as DynamoItem,
      data: game,
    };

    await dynamo.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );

    return success(game);
  } catch (err) {
    console.error("Error updating attendance:", err);
    return error("Internal server error", 500);
  }
}
