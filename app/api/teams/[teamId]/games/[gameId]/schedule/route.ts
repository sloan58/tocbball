import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Generate an 8-period playing time schedule
 */
function generateSchedule(playerIds: string[]) {
  if (playerIds.length === 0) {
    return { periods: [] }
  }

  const totalPeriods = 8
  const playersPerPeriod = 5

  const targetPeriodsPerPlayer = Math.floor((totalPeriods * playersPerPeriod) / playerIds.length)
  const extraPeriods = (totalPeriods * playersPerPeriod) % playerIds.length

  const playerPeriods: Record<string, number> = {}
  playerIds.forEach((playerId, index) => {
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

// POST /api/teams/[teamId]/games/[gameId]/schedule
export async function POST(
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

    const attendance = JSON.parse(game.attendance || '[]')
    if (attendance.length === 0) {
      return NextResponse.json({ error: 'No attendance recorded' }, { status: 400 })
    }

    const schedule = generateSchedule(attendance)

    const updatedGame = await db.game.update({
      where: { id: gameId },
      data: {
        schedule: JSON.stringify(schedule),
      },
    })

    return NextResponse.json(updatedGame)
  } catch (error) {
    console.error('Error generating schedule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
