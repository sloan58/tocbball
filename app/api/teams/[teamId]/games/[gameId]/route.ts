import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/teams/[teamId]/games/[gameId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; gameId: string }> }
) {
  try {
    const { gameId } = await params
    const game = await db.game.findUnique({
      where: { id: gameId },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    return NextResponse.json(game)
  } catch (error) {
    console.error('Error getting game:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/teams/[teamId]/games/[gameId]
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

    const { date, opponent, location } = await request.json()
    if (!date) {
      return NextResponse.json({ error: 'Game date required' }, { status: 400 })
    }
    if (!location) {
      return NextResponse.json({ error: 'Game location required' }, { status: 400 })
    }
    if (!opponent) {
      return NextResponse.json({ error: 'Opponent required' }, { status: 400 })
    }

    const game = await db.game.update({
      where: { id: gameId },
      data: {
        date: new Date(date),
        location,
        opponent,
      },
    })

    return NextResponse.json(game)
  } catch (error) {
    console.error('Error updating game:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
