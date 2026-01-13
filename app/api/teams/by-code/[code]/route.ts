import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/teams/[code] - Get team by code (without admin PIN)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const team = await db.team.findUnique({
      where: { code },
      select: {
        id: true,
        name: true,
        code: true,
        createdAt: true,
        // Don't return adminPin
      },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    return NextResponse.json(team)
  } catch (error) {
    console.error('Error getting team:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
