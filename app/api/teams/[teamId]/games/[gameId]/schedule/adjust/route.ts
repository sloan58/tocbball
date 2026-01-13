import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Adjust an existing schedule to add or remove players
 * 
 * Rules:
 * - Rule 1: All players must play at least 1/2 of each quarter (1 period per quarter = 4 periods total)
 * - Rule 2: Late players must play at least 1/2 of each quarter in the second half (1 period per quarter in periods 5-8)
 * - Rule 3: Substitutions only at period boundaries
 * - Don't modify completed periods
 * - Redistribute playing time evenly when players are added/removed
 */
function adjustSchedule(
  currentSchedule: any,
  playersToAdd: string[],
  playersToRemove: string[],
  allAvailablePlayers: string[],
  startAdjustingFromPeriod: number = 1
): any {
  const totalPeriods = 8
  const playersPerPeriod = 5
  
  // Create a copy of the schedule
  const periods = currentSchedule.periods.map((p: any) => ({
    ...p,
    players: [...p.players]
  }))
  
  // Count how many periods each player has already played (in completed periods only)
  const playerCountsInCompletedPeriods: Record<string, number> = {}
  allAvailablePlayers.forEach(id => playerCountsInCompletedPeriods[id] = 0)
  
  for (let period = 1; period < startAdjustingFromPeriod; period++) {
    const periodData = periods.find((p: any) => p.period === period)
    if (periodData && periodData.completed) {
      periodData.players.forEach((playerId: string) => {
        if (playerCountsInCompletedPeriods[playerId] !== undefined) {
          playerCountsInCompletedPeriods[playerId]++
        }
      })
    }
  }
  
  // Calculate remaining periods to distribute
  const remainingPeriods = periods.filter(
    (p: any) => p.period >= startAdjustingFromPeriod && !p.completed
  ).length
  
  if (remainingPeriods === 0) {
    // No periods to adjust
    return { periods }
  }
  
  const totalSlotsRemaining = remainingPeriods * playersPerPeriod
  
  // Calculate target periods per player for remaining periods
  const targetPeriodsPerPlayer = Math.floor(totalSlotsRemaining / allAvailablePlayers.length)
  const extraPeriods = totalSlotsRemaining % allAvailablePlayers.length
  
  // Assign target periods to each player (including what they've already played)
  const playerTargets: Record<string, number> = {}
  allAvailablePlayers.forEach((playerId, index) => {
    // For late players (playersToAdd), ensure they get at least 1 period per quarter in second half
    const isLatePlayer = playersToAdd.includes(playerId)
    if (isLatePlayer) {
      // Late players get their share, but we'll prioritize second half later
      playerTargets[playerId] = targetPeriodsPerPlayer + (index < extraPeriods ? 1 : 0)
    } else {
      // Existing players get their share
      playerTargets[playerId] = targetPeriodsPerPlayer + (index < extraPeriods ? 1 : 0)
    }
  })
  
  // Remove players from future periods
  if (playersToRemove.length > 0) {
    for (let period = startAdjustingFromPeriod; period <= totalPeriods; period++) {
      const periodData = periods.find((p: any) => p.period === period)
      if (periodData && !periodData.completed) {
        periodData.players = periodData.players.filter(
          (playerId: string) => !playersToRemove.includes(playerId)
        )
      }
    }
  }
  
  // Redistribute playing time for future periods
  const playerCounts: Record<string, number> = {}
  allAvailablePlayers.forEach(id => playerCounts[id] = 0)
  
  // First, handle late players - ensure they get at least 1 period per quarter in second half (Rule 2)
  if (playersToAdd.length > 0) {
    const quarters = [
      { quarter: 3, periods: [5, 6] },
      { quarter: 4, periods: [7, 8] }
    ]
    
    quarters.forEach(({ periods: quarterPeriods }) => {
      quarterPeriods.forEach(periodNum => {
        if (periodNum < startAdjustingFromPeriod) return
        const periodData = periods.find((p: any) => p.period === periodNum)
        if (!periodData || periodData.completed) return
        
        playersToAdd.forEach(playerId => {
          // Count periods this player has in this quarter
          const periodsInQuarter = quarterPeriods.filter(p => {
            if (p < startAdjustingFromPeriod) return false
            const pData = periods.find((per: any) => per.period === p)
            return pData?.players.includes(playerId) && !pData?.completed
          }).length
          
          // If player doesn't have a period in this quarter and period isn't full
          if (periodsInQuarter === 0 && periodData.players.length < playersPerPeriod) {
            if (!periodData.players.includes(playerId)) {
              periodData.players.push(playerId)
              playerCounts[playerId]++
            }
          }
        })
      })
    })
  }
  
  // Now redistribute all remaining periods
  for (let period = startAdjustingFromPeriod; period <= totalPeriods; period++) {
    const periodData = periods.find((p: any) => p.period === period)
    if (!periodData || periodData.completed) continue
    
    // Calculate how many periods each player should have by this point
    const playerTargetsByPeriod: Record<string, number> = {}
    allAvailablePlayers.forEach(playerId => {
      const totalTarget = playerCountsInCompletedPeriods[playerId] + playerTargets[playerId]
      const periodsSoFar = playerCountsInCompletedPeriods[playerId] + playerCounts[playerId]
      playerTargetsByPeriod[playerId] = totalTarget - periodsSoFar
    })
    
    // Sort players by: 1) how many periods they still need, 2) current count (ascending)
    const sortedPlayers = [...allAvailablePlayers].sort((a, b) => {
      const targetDiff = playerTargetsByPeriod[b] - playerTargetsByPeriod[a]
      if (Math.abs(targetDiff) > 0.1) {
        return targetDiff > 0 ? -1 : 1
      }
      // Tiebreaker: prefer players with fewer current periods
      if (playerCounts[a] !== playerCounts[b]) {
        return playerCounts[a] - playerCounts[b]
      }
      return a.localeCompare(b)
    })
    
    // Select 5 players for this period
    const periodPlayers: string[] = []
    for (const playerId of sortedPlayers) {
      if (periodPlayers.length >= playersPerPeriod) break
      if (!periodPlayers.includes(playerId)) {
        // Check if player is already in this period (from late player logic above)
        if (periodData.players.includes(playerId)) {
          periodPlayers.push(playerId)
        } else if (playerTargetsByPeriod[playerId] > 0 || playerCounts[playerId] < playerTargets[playerId]) {
          periodPlayers.push(playerId)
          playerCounts[playerId]++
        }
      }
    }
    
    // If we still need players (fill to 5)
    if (periodPlayers.length < playersPerPeriod) {
      for (const playerId of sortedPlayers) {
        if (periodPlayers.length >= playersPerPeriod) break
        if (!periodPlayers.includes(playerId)) {
          periodPlayers.push(playerId)
          if (!periodData.players.includes(playerId)) {
            playerCounts[playerId]++
          }
        }
      }
    }
    
    periodData.players = periodPlayers
  }
  
  return { periods }
}

// PUT /api/teams/[teamId]/games/[gameId]/schedule/adjust
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; gameId: string }> }
) {
  try {
    const { teamId, gameId } = await params
    const pin = request.headers.get('x-admin-pin')
    if (!pin) {
      return NextResponse.json({ error: 'Admin PIN required' }, { status: 401 })
    }

    const team = await db.team.findUnique({
      where: { id: teamId },
      select: { adminPin: true },
    })

    if (!team || team.adminPin !== pin) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    const game = await db.game.findUnique({
      where: { id: gameId },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const { playersToAdd, playersToRemove, startAdjustingFromPeriod } = await request.json()

    if (!game.schedule) {
      return NextResponse.json({ error: 'Schedule not found. Generate schedule first.' }, { status: 400 })
    }

    const currentSchedule = JSON.parse(game.schedule)
    const attendance = JSON.parse(game.attendance || '[]')
    
    // Determine the updated attendance list
    const updatedAttendance = [
      ...attendance.filter((id: string) => !playersToRemove.includes(id)),
      ...playersToAdd.filter((id: string) => !attendance.includes(id))
    ]

    const adjustedSchedule = adjustSchedule(
      currentSchedule,
      playersToAdd || [],
      playersToRemove || [],
      updatedAttendance,
      startAdjustingFromPeriod || 1
    )

    // Update both schedule and attendance
    const updatedGame = await db.game.update({
      where: { id: gameId },
      data: {
        schedule: JSON.stringify(adjustedSchedule),
        attendance: JSON.stringify(updatedAttendance),
      },
    })

    return NextResponse.json(updatedGame)
  } catch (error) {
    console.error('Error adjusting schedule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
