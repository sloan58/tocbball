import { APIGatewayProxyEvent } from "aws-lambda";
import { verifyAdminPin } from "./verify-pin";

/**
 * Validate admin PIN from request header
 * Returns true if valid, false otherwise
 */
export async function validatePinHeader(
  event: APIGatewayProxyEvent,
  teamId: string
): Promise<boolean> {
  const pin = event.headers["x-admin-pin"] || event.headers["X-Admin-PIN"];
  if (!pin) {
    return false;
  }
  return verifyAdminPin(teamId, pin);
}
