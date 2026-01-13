import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/teams/[teamId]/games/[gameId]/periods/[periodNumber]/stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; gameId: string; periodNumber: string }> }
) {
  try {
    const { teamId, gameId, periodNumber } = await params
    const period = parseInt(periodNumber)
    
    if (isNaN(period) || period < 1 || period > 8) {
      return NextResponse.json({ error: 'Invalid period number' }, { status: 400 })
    }

    const game = await db.game.findUnique({
      where: { id: gameId },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const stats = game.stats ? JSON.parse(game.stats) : {}
    const periodStats = stats[period] || {}

    return NextResponse.json({ period, stats: periodStats })
  } catch (error) {
    console.error('Error fetching period stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/teams/[teamId]/games/[gameId]/periods/[periodNumber]/stats
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; gameId: string; periodNumber: string }> }
) {
  try {
    const { teamId, gameId, periodNumber } = await params
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

    const period = parseInt(periodNumber)
    if (isNaN(period) || period < 1 || period > 8) {
      return NextResponse.json({ error: 'Invalid period number' }, { status: 400 })
    }

    const game = await db.game.findUnique({
      where: { id: gameId },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const { playerId, statName, value } = await request.json()
    
    if (!playerId || !statName || typeof value !== 'number' || value < 0) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    const validStats = ['threePointer', 'fieldGoal', 'freeThrow', 'assist', 'steal', 'rebound', 'turnover', 'block', 'foul']
    if (!validStats.includes(statName)) {
      return NextResponse.json({ error: 'Invalid stat name' }, { status: 400 })
    }

    const stats = game.stats ? JSON.parse(game.stats) : {}
    if (!stats[period]) {
      stats[period] = {}
    }
    if (!stats[period][playerId]) {
      stats[period][playerId] = {}
    }

    stats[period][playerId][statName] = value

    const updatedGame = await db.game.update({
      where: { id: gameId },
      data: {
        stats: JSON.stringify(stats),
      },
    })

    return NextResponse.json(updatedGame)
  } catch (error) {
    console.error('Error updating period stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
