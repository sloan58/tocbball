import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { dynamo, TABLE_NAME } from "../util/dynamodb";
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { success, error } from "../util/response";
import { generateTeamCode } from "../util/team-code";
import { generateAdminPin } from "../util/pin";
import { Team, DynamoItem } from "@tocbball/shared";

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return error("Request body required", 400);
  }

  try {
    const { name } = JSON.parse(event.body);
    if (!name) {
      return error("Team name required", 400);
    }

    // Generate unique team code
    let code = generateTeamCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await dynamo.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: "GSI1",
          KeyConditionExpression: "GSI1PK = :pk",
          ExpressionAttributeValues: {
            ":pk": `TEAM_CODE#${code}`,
          },
          Limit: 1,
        })
      );
      if (!existing.Items || existing.Items.length === 0) {
        break; // Code is unique
      }
      code = generateTeamCode();
      attempts++;
    }

    const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const adminPin = generateAdminPin();
    const team: Team = {
      id: teamId,
      name,
      code,
      adminPin,
      createdAt: new Date().toISOString(),
    };

    const item: DynamoItem = {
      PK: teamId,
      SK: `TEAM#${teamId}`,
      GSI1PK: `TEAM_CODE#${code}`,
      GSI1SK: `TEAM#${teamId}`,
      entityType: "TEAM",
      data: team,
    };

    await dynamo.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );

    return success(team, 201);
  } catch (err) {
    console.error("Error creating team:", err);
    return error("Internal server error", 500);
  }
}
