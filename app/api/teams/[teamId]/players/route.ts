import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/teams/[teamId]/players
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params
    const players = await db.player.findMany({
      where: { teamId, active: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(players)
  } catch (error) {
    console.error('Error listing players:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/teams/[teamId]/players
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

    const { name, jerseyNumber, level, isPointGuard } = await request.json()
    if (!name) {
      return NextResponse.json({ error: 'Player name required' }, { status: 400 })
    }
    if (!jerseyNumber) {
      return NextResponse.json({ error: 'Jersey number required' }, { status: 400 })
    }

    const jerseyValue = parseInt(jerseyNumber)
    if (Number.isNaN(jerseyValue) || jerseyValue < 1 || jerseyValue > 99) {
      return NextResponse.json({ error: 'Jersey number must be between 1 and 99' }, { status: 400 })
    }

    // Validate level is 1-5 or null
    const levelValue = level ? parseInt(level) : null
    if (levelValue !== null && (levelValue < 1 || levelValue > 5)) {
      return NextResponse.json({ error: 'Level must be between 1 and 5' }, { status: 400 })
    }

    const player = await db.player.create({
      data: {
        teamId,
        name,
        jerseyNumber: jerseyValue,
        level: levelValue,
        isPointGuard: Boolean(isPointGuard),
      },
    })

    return NextResponse.json(player, { status: 201 })
  } catch (error) {
    console.error('Error creating player:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
