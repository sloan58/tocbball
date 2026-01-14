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

    const { name, jerseyNumber, grade, isPointGuard } = await request.json()
    if (!name) {
      return NextResponse.json({ error: 'Player name required' }, { status: 400 })
    }

    // Validate grade is 1-5 or null
    const gradeValue = grade ? parseInt(grade) : null
    if (gradeValue !== null && (gradeValue < 1 || gradeValue > 5)) {
      return NextResponse.json({ error: 'Grade must be between 1 and 5' }, { status: 400 })
    }

    const player = await db.player.create({
      data: {
        teamId,
        name,
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : null,
        grade: gradeValue,
        isPointGuard: Boolean(isPointGuard),
      },
    })

    return NextResponse.json(player, { status: 201 })
  } catch (error) {
    console.error('Error creating player:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
