import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Adjust an existing schedule to add or remove players
 */
function adjustSchedule(
  currentSchedule: any,
  playersToAdd: string[],
  playersToRemove: string[],
  allAvailablePlayers: string[],
  startAdjustingFromPeriod: number = 1,
  playerStarMap: Record<string, boolean> = {}
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
    const status = periodData?.status || (periodData?.completed ? 'completed' : 'not_started')
    if (periodData && (status === 'completed' || status === 'started')) {
      periodData.players.forEach((playerId: string) => {
        if (playerCountsInCompletedPeriods[playerId] !== undefined) {
          playerCountsInCompletedPeriods[playerId]++
        }
      })
    }
  }
  
  // Calculate remaining periods to distribute (including current period if 'not_started')
  // Only adjust periods with status 'not_started'
  const remainingPeriods = periods.filter((p: any) => {
    const status = p.status || (p.completed ? 'completed' : 'not_started')
    return p.period >= startAdjustingFromPeriod && status === 'not_started'
  }).length
  
  if (remainingPeriods === 0) {
    // No periods to adjust
    return { periods }
  }
  
  // Handle "started" periods: if a removed player is in a started period, remove them and fill the slot
  // Check ALL periods, not just from startAdjustingFromPeriod, because started periods can be anywhere
  if (playersToRemove.length > 0) {
    for (let period = 1; period <= totalPeriods; period++) {
      const periodData = periods.find((p: any) => p.period === period)
      const status = periodData?.status || (periodData?.completed ? 'completed' : 'not_started')
      
      if (periodData && status === 'started') {
        // Remove injured players from this started period
        const hasRemovedPlayer = periodData.players.some((playerId: string) => playersToRemove.includes(playerId))
        if (hasRemovedPlayer) {
          periodData.players = periodData.players.filter(
            (playerId: string) => !playersToRemove.includes(playerId) && allAvailablePlayers.includes(playerId)
          )
          
          // Fill the slot with an available player (prioritize players with fewer total periods)
          const availableForSub = allAvailablePlayers.filter(
            (id: string) => !periodData.players.includes(id) && !playersToRemove.includes(id)
          )
          
          // Sort by total count to prioritize players with fewer periods
          const sortedForSub = availableForSub.sort((a, b) => {
            const totalA = playerCountsInCompletedPeriods[a] || 0
            const totalB = playerCountsInCompletedPeriods[b] || 0
            if (totalA !== totalB) return totalA - totalB
            return a.localeCompare(b)
          })
          
          while (periodData.players.length < playersPerPeriod && sortedForSub.length > 0) {
            periodData.players.push(sortedForSub.shift()!)
          }
        }
      }
    }
  }
  
  // Clear all 'not_started' periods (including current period) before redistributing
  const currentPeriodData = periods.find((p: any) => p.period === startAdjustingFromPeriod)
  const currentPeriodStatus = currentPeriodData?.status || (currentPeriodData?.completed ? 'completed' : 'not_started')
  
  for (let period = startAdjustingFromPeriod; period <= totalPeriods; period++) {
    const periodData = periods.find((p: any) => p.period === period)
    const status = periodData?.status || (periodData?.completed ? 'completed' : 'not_started')
    if (periodData && status === 'not_started') {
      periodData.players = []
    }
  }
  
  // Redistribute playing time for all 'not_started' periods (including current period)
  const playerCounts: Record<string, number> = {}
  allAvailablePlayers.forEach(id => {
    playerCounts[id] = 0 // Start fresh since we cleared all 'not_started' periods
  })
  
  // Redistribute all 'not_started' periods (including current period)
  // Use round-robin that considers TOTAL playing time (completed + future so far)
  for (let period = startAdjustingFromPeriod; period <= totalPeriods; period++) {
    const periodData = periods.find((p: any) => p.period === period)
    const status = periodData?.status || (periodData?.completed ? 'completed' : 'not_started')
    if (!periodData || status !== 'not_started') continue
    
    // Sort players by TOTAL count (completed + future so far) - ensures even TOTAL distribution
    // Star players get priority when counts are equal
    const sortedPlayers = [...allAvailablePlayers].sort((a, b) => {
      const totalA = playerCountsInCompletedPeriods[a] + playerCounts[a]
      const totalB = playerCountsInCompletedPeriods[b] + playerCounts[b]
      if (totalA !== totalB) {
        return totalA - totalB
      }
      // If counts are equal, prioritize star players
      const aIsStar = playerStarMap[a] || false
      const bIsStar = playerStarMap[b] || false
      if (aIsStar !== bIsStar) {
        return bIsStar ? 1 : -1 // Star players first
      }
      return a.localeCompare(b)
    })
    
    // Select 5 players for this period
    const periodPlayers: string[] = []
    for (const playerId of sortedPlayers) {
      if (periodPlayers.length >= playersPerPeriod) break
      if (!periodPlayers.includes(playerId)) {
        periodPlayers.push(playerId)
        playerCounts[playerId]++
      }
    }
    
    periodData.players = periodPlayers
  }
  
  return { periods }
}

/**
 * Generate an 8-period playing time schedule
 */
function generateSchedule(playerIds: string[], playerStarMap: Record<string, boolean> = {}) {
  if (playerIds.length === 0) {
    return { periods: [] }
  }

  const totalPeriods = 8
  const playersPerPeriod = 5

  const targetPeriodsPerPlayer = Math.floor((totalPeriods * playersPerPeriod) / playerIds.length)
  const extraPeriods = (totalPeriods * playersPerPeriod) % playerIds.length

  // Sort players: star players first, then non-star players
  const sortedPlayerIds = [...playerIds].sort((a, b) => {
    const aIsStar = playerStarMap[a] || false
    const bIsStar = playerStarMap[b] || false
    if (aIsStar !== bIsStar) {
      return bIsStar ? 1 : -1 // Star players first
    }
    return a.localeCompare(b) // Then alphabetical
  })

  const playerPeriods: Record<string, number> = {}
  sortedPlayerIds.forEach((playerId, index) => {
    playerPeriods[playerId] = targetPeriodsPerPlayer + (index < extraPeriods ? 1 : 0)
  })

  const periods: any[] = []
  const playerCounts: Record<string, number> = {}
  playerIds.forEach(id => playerCounts[id] = 0)

  for (let period = 1; period <= totalPeriods; period++) {
    const periodPlayers: string[] = []

    const sortedPlayers = [...playerIds].sort((a, b) => {
      if (playerCounts[a] !== playerCounts[b]) {
        return playerCounts[a] - playerCounts[b]
      }
      // If counts are equal, prioritize star players
      const aIsStar = playerStarMap[a] || false
      const bIsStar = playerStarMap[b] || false
      if (aIsStar !== bIsStar) {
        return bIsStar ? 1 : -1 // Star players first
      }
      return a.localeCompare(b)
    })

    for (const playerId of sortedPlayers) {
      if (periodPlayers.length >= playersPerPeriod) break
      if (playerCounts[playerId] < playerPeriods[playerId]) {
        periodPlayers.push(playerId)
        playerCounts[playerId]++
      }
    }

    if (periodPlayers.length < playersPerPeriod) {
      for (const playerId of sortedPlayers) {
        if (periodPlayers.length >= playersPerPeriod) break
        if (!periodPlayers.includes(playerId)) {
          periodPlayers.push(playerId)
          playerCounts[playerId]++
        }
      }
    }

    periods.push({
      period,
      players: periodPlayers,
      status: 'not_started',
      completed: false // Backward compatibility
    })
  }

  return { periods }
}

// PUT /api/teams/[teamId]/games/[gameId]/attendance
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

    const { attendance } = await request.json()
    if (!Array.isArray(attendance)) {
      return NextResponse.json({ error: 'Invalid attendance data' }, { status: 400 })
    }

    // Fetch player data to get star status
    const players = await db.player.findMany({
      where: { teamId, id: { in: attendance } },
      select: { id: true, isStar: true },
    })
    const playerStarMap: Record<string, boolean> = {}
    players.forEach(p => {
      playerStarMap[p.id] = p.isStar || false
    })

    const currentAttendance = JSON.parse(game.attendance || '[]')
    const currentSchedule = game.schedule ? JSON.parse(game.schedule) : null
    
    // Determine which players were added/removed
    const playersToAdd = attendance.filter((id: string) => !currentAttendance.includes(id))
    const playersToRemove = currentAttendance.filter((id: string) => !attendance.includes(id))
    
    let updatedSchedule = currentSchedule
    
    // If no schedule exists, generate one
    if (!currentSchedule || !currentSchedule.periods) {
      updatedSchedule = generateSchedule(attendance, playerStarMap)
    } else if (playersToAdd.length > 0 || playersToRemove.length > 0) {
      // Schedule exists and attendance changed - adjust the schedule
      // Find the first 'not_started' period to start adjusting from
      let startAdjustingFromPeriod = 1
      const firstNotStarted = currentSchedule.periods.find((p: any) => {
        const status = p.status || (p.completed ? 'completed' : 'not_started')
        return status === 'not_started'
      })
      if (firstNotStarted) {
        startAdjustingFromPeriod = firstNotStarted.period
      }
      
      // If starting from period 1 with no started/completed periods, just regenerate the schedule
      if (startAdjustingFromPeriod === 1) {
        const hasStartedOrCompleted = currentSchedule.periods.some((p: any) => {
          const status = p.status || (p.completed ? 'completed' : 'not_started')
          return status === 'started' || status === 'completed'
        })
        if (!hasStartedOrCompleted) {
          updatedSchedule = generateSchedule(attendance, playerStarMap)
        } else {
          updatedSchedule = adjustSchedule(
            currentSchedule,
            playersToAdd,
            playersToRemove,
            attendance,
            startAdjustingFromPeriod,
            playerStarMap
          )
        }
      } else {
        updatedSchedule = adjustSchedule(
          currentSchedule,
          playersToAdd,
          playersToRemove,
          attendance,
          startAdjustingFromPeriod,
          playerStarMap
        )
      }
    }
    // If attendance hasn't changed, keep the existing schedule

    const updatedGame = await db.game.update({
      where: { id: gameId },
      data: {
        attendance: JSON.stringify(attendance),
        schedule: JSON.stringify(updatedSchedule),
      },
    })

    return NextResponse.json(updatedGame)
  } catch (error) {
    console.error('Error updating attendance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
