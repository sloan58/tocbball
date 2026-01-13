import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { dynamo, TABLE_NAME } from "../util/dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { success, error } from "../util/response";
import { validatePinHeader } from "../util/validate-pin-header";
import { Game, DynamoItem } from "@tocbball/shared";

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const teamId = event.pathParameters?.teamId;
  if (!teamId || !event.body) {
    return error("Team ID and request body required", 400);
  }

  const isValidPin = await validatePinHeader(event, teamId);
  if (!isValidPin) {
    return error("Invalid or missing admin PIN", 401);
  }

  try {
    const { date } = JSON.parse(event.body);
    if (!date) {
      return error("Game date required", 400);
    }

    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const game: Game = {
      id: gameId,
      teamId,
      date,
      attendance: [],
      createdAt: now,
      updatedAt: now,
    };

    const item: DynamoItem = {
      PK: teamId,
      SK: `GAME#${gameId}`,
      entityType: "GAME",
      data: game,
    };

    await dynamo.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );

    return success(game, 201);
  } catch (err) {
    console.error("Error creating game:", err);
    return error("Internal server error", 500);
  }
}
