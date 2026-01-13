import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/teams/[teamId]/coaches/[coachId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; coachId: string }> }
) {
  try {
    const { teamId, coachId } = await params
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

    await db.coach.delete({
      where: { id: coachId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting coach:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
