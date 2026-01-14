import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const TOTAL_PERIODS = 8
const PLAYERS_PER_PERIOD = 5

const getMaxSegments = (playerCount: number): number | null => {
  if (playerCount === 10) return 4
  if (playerCount >= 8 && playerCount <= 9) return 5
  if (playerCount === 7) return 6
  return null
}

const buildComparator = (
  totalCounts: Record<string, number>,
  playerGradeMap: Record<string, number>
) => (a: string, b: string) => {
  if (totalCounts[a] !== totalCounts[b]) {
    return totalCounts[a] - totalCounts[b]
  }
  const gradeA = playerGradeMap[a] || 0
  const gradeB = playerGradeMap[b] || 0
  if (gradeA !== gradeB) {
    return gradeB - gradeA
  }
  return a.localeCompare(b)
}

const buildScheduleWithConstraints = (
  playerIds: string[],
  playerGradeMap: Record<string, number>,
  playerPGMap: Record<string, boolean>,
  periods: any[],
  lockedPeriodNumbers: Set<number>
) => {
  const maxSegments = getMaxSegments(playerIds.length)
  const totalCounts: Record<string, number> = {}
  const quarterCounts: Record<string, number[]> = {}
  playerIds.forEach(id => {
    totalCounts[id] = 0
    quarterCounts[id] = [0, 0, 0, 0]
  })

  periods.forEach(period => {
    if (!lockedPeriodNumbers.has(period.period)) return
    const quarterIndex = Math.floor((period.period - 1) / 2)
    period.players.forEach((playerId: string) => {
      if (totalCounts[playerId] === undefined) return
      totalCounts[playerId]++
      quarterCounts[playerId][quarterIndex]++
    })
  })

  const comparator = buildComparator(totalCounts, playerGradeMap)
  const hasAnyPG = playerIds.some(id => playerPGMap[id])

  const addPlayerToPeriod = (
    period: any,
    quarterIndex: number,
    playerId: string
  ) => {
    period.players.push(playerId)
    totalCounts[playerId]++
    quarterCounts[playerId][quarterIndex]++
  }

  const canAddPlayer = (period: any, playerId: string) => {
    if (period.players.includes(playerId)) return false
    if (maxSegments !== null && totalCounts[playerId] >= maxSegments) return false
    return true
  }

  const periodHasPG = (period: any) =>
    period.players.some((id: string) => playerPGMap[id])

  const quarters = [
    { quarterIndex: 0, periodNumbers: [1, 2] },
    { quarterIndex: 1, periodNumbers: [3, 4] },
    { quarterIndex: 2, periodNumbers: [5, 6] },
    { quarterIndex: 3, periodNumbers: [7, 8] },
  ]

  quarters.forEach(({ quarterIndex, periodNumbers }) => {
    const quarterPeriods = periodNumbers.map((num) =>
      periods.find((p: any) => p.period === num)
    )
    if (quarterPeriods.some((p: any) => !p)) return

    const slotsLeft = quarterPeriods.map((p: any, idx: number) => {
      if (lockedPeriodNumbers.has(periodNumbers[idx])) return 0
      return PLAYERS_PER_PERIOD - p.players.length
    })

    const pickPeriodIndex = (playerId: string) => {
      const candidates = [0, 1].filter((idx) => slotsLeft[idx] > 0)
      if (candidates.length === 0) return -1
      if (playerPGMap[playerId] && hasAnyPG) {
        const noPg = candidates.filter(idx => !periodHasPG(quarterPeriods[idx]))
        if (noPg.length > 0) {
          return noPg.sort((a, b) => slotsLeft[b] - slotsLeft[a])[0]
        }
      }
      return candidates.sort((a, b) => slotsLeft[b] - slotsLeft[a])[0]
    }

    // Phase A: ensure each player appears at least once in the quarter
    const unassigned = playerIds.filter(id => quarterCounts[id][quarterIndex] === 0)
    unassigned.sort(comparator).forEach(playerId => {
      const idx = pickPeriodIndex(playerId)
      if (idx === -1) return
      const period = quarterPeriods[idx]
      if (!canAddPlayer(period, playerId)) return
      addPlayerToPeriod(period, quarterIndex, playerId)
      slotsLeft[idx]--
    })

    // Phase B: fill remaining slots, respecting max segments
    let remainingSlots = slotsLeft[0] + slotsLeft[1]
    while (remainingSlots > 0) {
      const candidates = playerIds.filter((id) => {
        if (maxSegments !== null && totalCounts[id] >= maxSegments) return false
        return true
      })
      if (candidates.length === 0) break
      candidates.sort(comparator)
      let placed = false
      for (const playerId of candidates) {
        const idx = pickPeriodIndex(playerId)
        if (idx === -1) continue
        const period = quarterPeriods[idx]
        if (!canAddPlayer(period, playerId)) continue
        addPlayerToPeriod(period, quarterIndex, playerId)
        slotsLeft[idx]--
        remainingSlots--
        placed = true
        break
      }
      if (!placed) break
    }

    // Best-effort PG coverage without violating max segments
    if (hasAnyPG) {
      quarterPeriods.forEach((period: any, idx: number) => {
        if (periodHasPG(period)) return
        if (slotsLeft[idx] <= 0) return
        const pgCandidates = playerIds
          .filter(id => playerPGMap[id])
          .filter(id => canAddPlayer(period, id))
          .sort(comparator)
        if (pgCandidates.length === 0) return
        addPlayerToPeriod(period, quarterIndex, pgCandidates[0])
        slotsLeft[idx]--
      })
    }
  })

  return { periods }
}

/**
 * Adjust an existing schedule to add or remove players
 */
function adjustSchedule(
  currentSchedule: any,
  playersToAdd: string[],
  playersToRemove: string[],
  allAvailablePlayers: string[],
  startAdjustingFromPeriod: number = 1,
  playerGradeMap: Record<string, number> = {},
  playerPGMap: Record<string, boolean> = {}
): any {
  // Create a copy of the schedule
  const periods = currentSchedule.periods.map((p: any) => ({
    ...p,
    players: [...p.players]
  }))

  // Handle "started" periods: if a removed player is in a started period, remove them and fill the slot
  // Check ALL periods, not just from startAdjustingFromPeriod, because started periods can be anywhere
  if (playersToRemove.length > 0) {
    const maxSegments = getMaxSegments(allAvailablePlayers.length)
    for (let period = 1; period <= TOTAL_PERIODS; period++) {
      const periodData = periods.find((p: any) => p.period === period)
      const status = periodData?.status || (periodData?.completed ? 'completed' : 'not_started')
      
      if (periodData && status === 'started') {
        // Remove injured players from this started period
        const hasRemovedPlayer = periodData.players.some((playerId: string) => playersToRemove.includes(playerId))
        if (hasRemovedPlayer) {
          periodData.players = periodData.players.filter(
            (playerId: string) => !playersToRemove.includes(playerId) && allAvailablePlayers.includes(playerId)
          )
          
          // Fill the slot with an available player (prioritize players with fewer total periods, then by grade)
          const availableForSub = allAvailablePlayers.filter(
            (id: string) => !periodData.players.includes(id) && !playersToRemove.includes(id)
          )
          
          const totalCounts: Record<string, number> = {}
          allAvailablePlayers.forEach(id => totalCounts[id] = 0)
          periods.forEach((p: any) => {
            const s = p.status || (p.completed ? 'completed' : 'not_started')
            if (s !== 'completed' && s !== 'started') return
            p.players.forEach((id: string) => {
              if (totalCounts[id] !== undefined) totalCounts[id]++
            })
          })

          // Sort by total count to prioritize players with fewer periods, then by grade
          const sortedForSub = availableForSub.sort((a, b) => {
            const totalA = totalCounts[a] || 0
            const totalB = totalCounts[b] || 0
            if (totalA !== totalB) return totalA - totalB
            // If counts are equal, prioritize higher grade
            const gradeA = playerGradeMap[a] || 0
            const gradeB = playerGradeMap[b] || 0
            if (gradeA !== gradeB) return gradeB - gradeA
            return a.localeCompare(b)
          })
          
          while (periodData.players.length < PLAYERS_PER_PERIOD && sortedForSub.length > 0) {
            const nextId = sortedForSub.shift()!
            if (maxSegments !== null && totalCounts[nextId] >= maxSegments) {
              continue
            }
            periodData.players.push(nextId)
            totalCounts[nextId]++
          }
        }
      }
    }
  }

  // Clear all 'not_started' periods (including current period) before redistributing
  for (let period = startAdjustingFromPeriod; period <= TOTAL_PERIODS; period++) {
    const periodData = periods.find((p: any) => p.period === period)
    const status = periodData?.status || (periodData?.completed ? 'completed' : 'not_started')
    if (periodData && status === 'not_started') {
      periodData.players = []
    }
  }

  const lockedPeriodNumbers = new Set(
    periods
      .filter((p: any) => {
        const status = p.status || (p.completed ? 'completed' : 'not_started')
        return status !== 'not_started'
      })
      .map((p: any) => p.period)
  )

  return buildScheduleWithConstraints(
    allAvailablePlayers,
    playerGradeMap,
    playerPGMap,
    periods,
    lockedPeriodNumbers
  )
}

/**
 * Generate an 8-period playing time schedule
 */
function generateSchedule(
  playerIds: string[],
  playerGradeMap: Record<string, number> = {},
  playerPGMap: Record<string, boolean> = {}
) {
  if (playerIds.length === 0) {
    return { periods: [] }
  }
  const periods = Array.from({ length: TOTAL_PERIODS }, (_, index) => ({
    period: index + 1,
    players: [],
    status: 'not_started',
    completed: false, // Backward compatibility
  }))

  return buildScheduleWithConstraints(
    playerIds,
    playerGradeMap,
    playerPGMap,
    periods,
    new Set()
  )
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

    // Fetch player data to get grade and PG status
    const players = await db.player.findMany({
      where: { teamId, id: { in: attendance } },
      select: { id: true, grade: true, isPointGuard: true },
    })
    const playerGradeMap: Record<string, number> = {}
    const playerPGMap: Record<string, boolean> = {}
    players.forEach(p => {
      playerGradeMap[p.id] = p.grade || 0
      playerPGMap[p.id] = p.isPointGuard || false
    })

    const currentAttendance = JSON.parse(game.attendance || '[]')
    const currentSchedule = game.schedule ? JSON.parse(game.schedule) : null
    
    // Determine which players were added/removed
    const playersToAdd = attendance.filter((id: string) => !currentAttendance.includes(id))
    const playersToRemove = currentAttendance.filter((id: string) => !attendance.includes(id))
    
    let updatedSchedule = currentSchedule
    
    // If no schedule exists, generate one
    if (!currentSchedule || !currentSchedule.periods) {
      updatedSchedule = generateSchedule(attendance, playerGradeMap, playerPGMap)
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
          updatedSchedule = generateSchedule(attendance, playerGradeMap, playerPGMap)
        } else {
          updatedSchedule = adjustSchedule(
            currentSchedule,
            playersToAdd,
            playersToRemove,
            attendance,
            startAdjustingFromPeriod,
            playerGradeMap,
            playerPGMap
          )
        }
      } else {
        updatedSchedule = adjustSchedule(
          currentSchedule,
          playersToAdd,
          playersToRemove,
          attendance,
          startAdjustingFromPeriod,
          playerGradeMap,
          playerPGMap
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
