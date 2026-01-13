import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { dynamo, TABLE_NAME } from "../util/dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { success, error } from "../util/response";
import { validatePinHeader } from "../util/validate-pin-header";
import { Player, DynamoItem } from "@tocbball/shared";

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
    const { name, jerseyNumber } = JSON.parse(event.body);
    if (!name) {
      return error("Player name required", 400);
    }

    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const player: Player = {
      id: playerId,
      teamId,
      name,
      jerseyNumber,
      active: true,
      createdAt: new Date().toISOString(),
    };

    const item: DynamoItem = {
      PK: teamId,
      SK: `PLAYER#${playerId}`,
      entityType: "PLAYER",
      data: player,
    };

    await dynamo.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );

    return success(player, 201);
  } catch (err) {
    console.error("Error creating player:", err);
    return error("Internal server error", 500);
  }
}
