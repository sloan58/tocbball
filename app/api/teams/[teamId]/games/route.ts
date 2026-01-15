import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/teams/[teamId]/games
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params
    const games = await db.game.findMany({
      where: { teamId },
      orderBy: { date: 'asc' },
    })
    return NextResponse.json(games)
  } catch (error) {
    console.error('Error listing games:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/teams/[teamId]/games
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params
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

    const { date, opponent, location, venue } = await request.json()
    if (!date) {
      return NextResponse.json({ error: 'Game date required' }, { status: 400 })
    }
    if (!location) {
      return NextResponse.json({ error: 'Game location required' }, { status: 400 })
    }
    if (!opponent) {
      return NextResponse.json({ error: 'Opponent required' }, { status: 400 })
    }

    const venueValue = venue === 'away' ? 'away' : 'home'

    const game = await db.game.create({
      data: {
        teamId,
        date: new Date(date),
        location,
        opponent,
        venue: venueValue,
        attendance: '[]',
      },
    })

    return NextResponse.json(game, { status: 201 })
  } catch (error) {
    console.error('Error creating game:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
