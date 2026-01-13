import type { Schedule, Period } from './types';

/**
 * Pure function to generate an 8-period playing time schedule
 * 
 * Rules:
 * - 8 total periods (4 quarters with midpoint substitution)
 * - Target: 4 periods per player when roster allows
 * - If fewer players, distribute as evenly as possible
 * - Difference between most/least played periods should be ≤ 1 when feasible
 */
export function generateSchedule(playerIds: string[]): Schedule {
  if (playerIds.length === 0) {
    return { periods: [] };
  }

  const totalPeriods = 8;
  const playersPerPeriod = 5; // Basketball has 5 players on the court
  
  // Calculate target periods per player
  const targetPeriodsPerPlayer = Math.floor((totalPeriods * playersPerPeriod) / playerIds.length);
  const extraPeriods = (totalPeriods * playersPerPeriod) % playerIds.length;
  
  // Assign periods to each player
  const playerPeriods: Record<string, number> = {};
  playerIds.forEach((playerId, index) => {
    // Distribute extra periods to first N players
    playerPeriods[playerId] = targetPeriodsPerPlayer + (index < extraPeriods ? 1 : 0);
  });
  
  // Generate schedule using round-robin approach
  const periods: Period[] = [];
  const playerCounts: Record<string, number> = {};
  playerIds.forEach(id => playerCounts[id] = 0);
  
  for (let period = 1; period <= totalPeriods; period++) {
    const periodPlayers: string[] = [];
    
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
      if (periodPlayers.length >= playersPerPeriod) break;
      if (playerCounts[playerId] < playerPeriods[playerId]) {
        periodPlayers.push(playerId);
        playerCounts[playerId]++;
      }
    }
    
    // If we still need players (shouldn't happen, but safety check)
    if (periodPlayers.length < playersPerPeriod) {
      for (const playerId of sortedPlayers) {
        if (periodPlayers.length >= playersPerPeriod) break;
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

/**
 * Adjust an existing schedule to add or remove players
 * 
 * Rules:
 * - Rule 1: All players must play at least 1/2 of each quarter (1 period per quarter = 4 periods total)
 * - Rule 2: Late players must play at least 1/2 of each quarter in the second half (1 period per quarter in periods 5-8)
 * - Rule 3: Substitutions only at period boundaries
 * - Don't modify completed periods
 * - Don't modify periods that are in progress
 * 
 * @param currentSchedule - The existing schedule to adjust
 * @param playersToAdd - Player IDs to add (late arrivals)
 * @param playersToRemove - Player IDs to remove (early departures)
 * @param startAdjustingFromPeriod - First period to adjust (e.g., if player arrives in period 3, adjust from period 3)
 * @returns Updated schedule
 */
export function adjustSchedule(
  currentSchedule: Schedule,
  playersToAdd: string[],
  playersToRemove: string[],
  startAdjustingFromPeriod: number = 1
): Schedule {
  const totalPeriods = 8;
  const playersPerPeriod = 5;
  
  // Create a copy of the schedule
  const periods = currentSchedule.periods.map(p => ({
    ...p,
    players: [...p.players]
  }));
  
  // Remove players from future periods (don't modify completed or in-progress periods)
  if (playersToRemove.length > 0) {
    for (let period = startAdjustingFromPeriod; period <= totalPeriods; period++) {
      const periodData = periods.find(p => p.period === period);
      if (periodData) {
        // Remove the players from this period
        periodData.players = periodData.players.filter(
          playerId => !playersToRemove.includes(playerId)
        );
      }
    }
  }
  
  // Add late players to future periods
  // For late players, prioritize second half (periods 5-8) per Rule 2
  if (playersToAdd.length > 0) {
    // First, ensure late players get at least 1 period per quarter in second half (Rule 2)
    const secondHalfPeriods = [5, 6, 7, 8];
    const latePlayerCounts: Record<string, number> = {};
    playersToAdd.forEach(id => latePlayerCounts[id] = 0);
    
    // Count how many periods each late player already has in second half
    secondHalfPeriods.forEach(periodNum => {
      const periodData = periods.find(p => p.period === periodNum);
      if (periodData) {
        periodData.players.forEach(playerId => {
          if (playersToAdd.includes(playerId)) {
            latePlayerCounts[playerId]++;
          }
        });
      }
    });
    
    // Ensure each late player gets at least 1 period per quarter in second half
    // Quarters in second half: 3rd quarter (periods 5-6), 4th quarter (periods 7-8)
    const quarters = [
      { quarter: 3, periods: [5, 6] },
      { quarter: 4, periods: [7, 8] }
    ];
    
    quarters.forEach(({ periods: quarterPeriods }) => {
      quarterPeriods.forEach(periodNum => {
        const periodData = periods.find(p => p.period === periodNum);
        if (!periodData) return;
        
        // Check if any late player needs a period in this quarter
        playersToAdd.forEach(playerId => {
          // Count periods this player has in this quarter
          const periodsInQuarter = quarterPeriods.filter(p => {
            const pData = periods.find(per => per.period === p);
            return pData?.players.includes(playerId);
          }).length;
          
          // If player doesn't have a period in this quarter and period isn't full
          if (periodsInQuarter === 0 && periodData.players.length < playersPerPeriod) {
            if (!periodData.players.includes(playerId)) {
              periodData.players.push(playerId);
              latePlayerCounts[playerId]++;
            }
          }
        });
      });
    });
    
    // Now fill remaining slots in all future periods
    for (let period = startAdjustingFromPeriod; period <= totalPeriods; period++) {
      const periodData = periods.find(p => p.period === period);
      if (!periodData) continue;
      
      // Get all available players (original + late, excluding removed)
      const allAvailablePlayers = [
        ...periodData.players.filter(id => !playersToRemove.includes(id)),
        ...playersToAdd.filter(id => !periodData.players.includes(id))
      ];
      
      // Fill to 5 players
      while (periodData.players.length < playersPerPeriod) {
        // Find a player to add (prefer those with fewer periods)
        const playerCounts: Record<string, number> = {};
        allAvailablePlayers.forEach(id => {
          playerCounts[id] = periods
            .filter(p => p.period <= period)
            .reduce((count, p) => count + (p.players.includes(id) ? 1 : 0), 0);
        });
        
        const sortedPlayers = [...allAvailablePlayers].sort((a, b) => {
          if (playerCounts[a] !== playerCounts[b]) {
            return playerCounts[a] - playerCounts[b];
          }
          return a.localeCompare(b);
        });
        
        const playerToAdd = sortedPlayers.find(id => !periodData.players.includes(id));
        if (playerToAdd) {
          periodData.players.push(playerToAdd);
        } else {
          break; // No more players available
        }
      }
      
      // Remove excess players if we have more than 5 (shouldn't happen, but safety)
      while (periodData.players.length > playersPerPeriod) {
        periodData.players.pop();
      }
    }
  } else {
    // No players to add, just need to fill gaps from removed players
    for (let period = startAdjustingFromPeriod; period <= totalPeriods; period++) {
      const periodData = periods.find(p => p.period === period);
      if (!periodData) continue;
      
      // Get available players from attendance (excluding removed players)
      // We need the full attendance list - this will be passed separately
      // For now, we'll handle this in the API layer
    }
  }
  
  return { periods };
}
