import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/teams/[teamId]/players/[playerId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; playerId: string }> }
) {
  try {
    const { teamId, playerId } = await params
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

    const { name, jerseyNumber, isStar } = await request.json()
    if (!name) {
      return NextResponse.json({ error: 'Player name required' }, { status: 400 })
    }

    const player = await db.player.update({
      where: { id: playerId },
      data: {
        name,
        jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : null,
        isStar: Boolean(isStar),
      },
    })

    return NextResponse.json(player)
  } catch (error) {
    console.error('Error updating player:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/teams/[teamId]/players/[playerId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; playerId: string }> }
) {
  try {
    const { teamId, playerId } = await params
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

    await db.player.update({
      where: { id: playerId },
      data: { active: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting player:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
