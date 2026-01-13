import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/teams/[teamId]/verify-pin - Verify admin PIN
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params
    const { pin } = await request.json()
    if (!pin) {
      return NextResponse.json({ error: 'PIN required' }, { status: 400 })
    }

    const team = await db.team.findUnique({
      where: { id: teamId },
      select: { adminPin: true },
    })

    if (!team || team.adminPin !== pin) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Error verifying PIN:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
