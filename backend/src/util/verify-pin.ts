import { dynamo, TABLE_NAME } from "./dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";

/**
 * Verify admin PIN for a team
 */
export async function verifyAdminPin(teamId: string, pin: string): Promise<boolean> {
  try {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: teamId,
          SK: `TEAM#${teamId}`,
        },
      })
    );

    if (!result.Item) {
      return false;
    }

    const team = result.Item.data as any;
    return team.adminPin === pin;
  } catch (err) {
    console.error("Error verifying PIN:", err);
    return false;
  }
}
