import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { dynamo, TABLE_NAME } from "../util/dynamodb";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { success, error } from "../util/response";
import { validatePinHeader } from "../util/validate-pin-header";

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const teamId = event.pathParameters?.teamId;
  const playerId = event.pathParameters?.playerId;
  if (!teamId || !playerId) {
    return error("Team ID and player ID required", 400);
  }

  const isValidPin = await validatePinHeader(event, teamId);
  if (!isValidPin) {
    return error("Invalid or missing admin PIN", 401);
  }

  try {
    await dynamo.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: teamId,
          SK: `PLAYER#${playerId}`,
        },
      })
    );

    return success({ success: true });
  } catch (err) {
    console.error("Error deleting player:", err);
    return error("Internal server error", 500);
  }
}
