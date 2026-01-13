"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSchedule = generateSchedule;
/**
 * Pure function to generate an 8-period playing time schedule
 *
 * Rules:
 * - 8 total periods (4 quarters with midpoint substitution)
 * - Target: 4 periods per player when roster allows
 * - If fewer players, distribute as evenly as possible
 * - Difference between most/least played periods should be ≤ 1 when feasible
 */
function generateSchedule(playerIds) {
    if (playerIds.length === 0) {
        return { periods: [] };
    }
    const totalPeriods = 8;
    const playersPerPeriod = 5; // Basketball has 5 players on the court
    // Calculate target periods per player
    const targetPeriodsPerPlayer = Math.floor((totalPeriods * playersPerPeriod) / playerIds.length);
    const extraPeriods = (totalPeriods * playersPerPeriod) % playerIds.length;
    // Assign periods to each player
    const playerPeriods = {};
    playerIds.forEach((playerId, index) => {
        // Distribute extra periods to first N players
        playerPeriods[playerId] = targetPeriodsPerPlayer + (index < extraPeriods ? 1 : 0);
    });
    // Generate schedule using round-robin approach
    const periods = [];
    const playerCounts = {};
    playerIds.forEach(id => playerCounts[id] = 0);
    for (let period = 1; period <= totalPeriods; period++) {
        const periodPlayers = [];
        // Sort players by current period count (ascending) to balance distribution
        const sortedPlayers = [...playerIds].sort((a, b) => {
            if (playerCounts[a] !== playerCounts[b]) {
                return playerCounts[a] - playerCounts[b];
            }
            // Tiebreaker: use player ID for deterministic ordering
            return a.localeCompare(b);
        });
        // Select top N players who haven't reached their target
        for (const playerId of sortedPlayers) {
            if (periodPlayers.length >= playersPerPeriod)
                break;
            if (playerCounts[playerId] < playerPeriods[playerId]) {
                periodPlayers.push(playerId);
                playerCounts[playerId]++;
            }
        }
        // If we still need players (shouldn't happen, but safety check)
        if (periodPlayers.length < playersPerPeriod) {
            for (const playerId of sortedPlayers) {
                if (periodPlayers.length >= playersPerPeriod)
                    break;
                if (!periodPlayers.includes(playerId)) {
                    periodPlayers.push(playerId);
                    playerCounts[playerId]++;
                }
            }
        }
        periods.push({
            period,
            players: periodPlayers
        });
    }
    return { periods };
}
