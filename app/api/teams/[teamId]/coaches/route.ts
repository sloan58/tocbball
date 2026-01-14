import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/teams/[teamId]/coaches
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params
    const coaches = await db.coach.findMany({
      where: { teamId },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(coaches)
  } catch (error) {
    console.error('Error listing coaches:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/teams/[teamId]/coaches
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

    const { name, email, type } = await request.json()
    if (!name) {
      return NextResponse.json({ error: 'Coach name required' }, { status: 400 })
    }
    if (type !== 'head' && type !== 'assistant') {
      return NextResponse.json({ error: 'Coach type must be head or assistant' }, { status: 400 })
    }

    const coach = await db.coach.create({
      data: {
        teamId,
        name,
        email: email || null,
        type,
      },
    })

    return NextResponse.json(coach, { status: 201 })
  } catch (error) {
    console.error('Error creating coach:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
