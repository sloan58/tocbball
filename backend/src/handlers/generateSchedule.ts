import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { dynamo, TABLE_NAME } from "../util/dynamodb";
import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { success, error } from "../util/response";
import { validatePinHeader } from "../util/validate-pin-header";
import { generateSchedule } from "@tocbball/shared";
import { Game, DynamoItem } from "@tocbball/shared";

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const teamId = event.pathParameters?.teamId;
  const gameId = event.pathParameters?.gameId;
  if (!teamId || !gameId) {
    return error("Team ID and game ID required", 400);
  }

  const isValidPin = await validatePinHeader(event, teamId);
  if (!isValidPin) {
    return error("Invalid or missing admin PIN", 401);
  }

  try {
    // Get game
    const gameResult = await dynamo.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: teamId,
          SK: `GAME#${gameId}`,
        },
      })
    );

    if (!gameResult.Item) {
      return error("Game not found", 404);
    }

    const game = gameResult.Item.data as Game;
    if (!game.attendance || game.attendance.length === 0) {
      return error("No attendance recorded for this game", 400);
    }

    // Generate schedule
    const schedule = generateSchedule(game.attendance);
    const updatedGame: Game = {
      ...game,
      schedule,
      updatedAt: new Date().toISOString(),
    };

    const item: DynamoItem = {
      ...gameResult.Item as DynamoItem,
      data: updatedGame,
    };

    await dynamo.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );

    return success(updatedGame);
  } catch (err) {
    console.error("Error generating schedule:", err);
    return error("Internal server error", 500);
  }
}
