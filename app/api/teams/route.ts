import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateTeamCode, generateAdminPin } from '@/lib/team-code'

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const { name, league } = await request.json()
    if (!name) {
      return NextResponse.json({ error: 'Team name required' }, { status: 400 })
    }
    if (!league) {
      return NextResponse.json({ error: 'League required' }, { status: 400 })
    }

    // Generate unique team code
    let code = generateTeamCode()
    let attempts = 0
    while (attempts < 10) {
      const existing = await db.team.findUnique({ where: { code } })
      if (!existing) break
      code = generateTeamCode()
      attempts++
    }

    const adminPin = generateAdminPin()
    const team = await db.team.create({
      data: {
        name,
        league,
        code,
        adminPin,
      },
    })

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
