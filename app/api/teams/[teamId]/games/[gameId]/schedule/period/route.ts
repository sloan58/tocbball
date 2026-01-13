import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/teams/[teamId]/games/[gameId]/schedule/period - Update period completion status
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

    if (!game || !game.schedule) {
      return NextResponse.json({ error: 'Game or schedule not found' }, { status: 404 })
    }

    const { period, status } = await request.json()
    if (typeof period !== 'number' || !['not_started', 'started', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    const schedule = JSON.parse(game.schedule)
    const periodIndex = schedule.periods.findIndex((p: any) => p.period === period)
    
    if (periodIndex === -1) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    }

    schedule.periods[periodIndex].status = status
    // Maintain backward compatibility: set completed field based on status
    schedule.periods[periodIndex].completed = status === 'completed'

    const updatedGame = await db.game.update({
      where: { id: gameId },
      data: {
        schedule: JSON.stringify(schedule),
      },
    })

    return NextResponse.json(updatedGame)
  } catch (error) {
    console.error('Error updating period status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
