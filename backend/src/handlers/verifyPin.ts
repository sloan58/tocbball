import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { verifyAdminPin } from "../util/verify-pin";
import { success, error } from "../util/response";

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const teamId = event.pathParameters?.teamId;
  if (!teamId || !event.body) {
    return error("Team ID and request body required", 400);
  }

  try {
    const { pin } = JSON.parse(event.body);
    if (!pin) {
      return error("PIN required", 400);
    }

    const isValid = await verifyAdminPin(teamId, pin);
    if (!isValid) {
      return error("Invalid PIN", 401);
    }

    return success({ valid: true });
  } catch (err) {
    console.error("Error verifying PIN:", err);
    return error("Internal server error", 500);
  }
}
