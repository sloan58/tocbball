import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import PizZip from 'pizzip'
import { db } from '@/lib/db'

const TEMPLATE_PATH = path.join(
  process.cwd(),
  'templates',
  'playing-time-template.docx'
)

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const replaceAfterLabel = (xml: string, label: string, value: string) => {
  const pattern = new RegExp(
    `(<w:t[^>]*>\\s*${escapeRegExp(label)}:<\\/w:t><\\/w:r><w:r[^>]*><w:rPr>.*?<w:u[^>]*\\/?>.*?<\\/w:rPr>)<w:tab\\/>`,
    's'
  )
  if (!pattern.test(xml)) return xml
  return xml.replace(pattern, `$1<w:t xml:space="preserve"> ${escapeXml(value)}</w:t>`)
}

// GET /api/teams/[teamId]/games/[gameId]/export
export async function GET(
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
      select: { name: true, league: true, adminPin: true },
    })
    if (!team || team.adminPin !== pin) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    const game = await db.game.findUnique({
      where: { id: gameId },
      select: { date: true, opponent: true, location: true },
    })
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const templateBuffer = await fs.readFile(TEMPLATE_PATH)
    const zip = new PizZip(templateBuffer)
    const documentXml = zip.file('word/document.xml')?.asText()
    if (!documentXml) {
      return NextResponse.json({ error: 'Template not found' }, { status: 500 })
    }

    const formattedDate = new Date(game.date).toLocaleDateString('en-US')

    let updatedXml = documentXml
    updatedXml = replaceAfterLabel(updatedXml, 'TEAM', team.name)
    updatedXml = replaceAfterLabel(updatedXml, 'OPPOSING TEAM', game.opponent)
    updatedXml = replaceAfterLabel(updatedXml, 'LEAGUE', team.league)
    updatedXml = replaceAfterLabel(updatedXml, 'LOCATION', game.location)
    updatedXml = replaceAfterLabel(updatedXml, 'DATE', formattedDate)

    zip.file('word/document.xml', updatedXml)
    const outputBuffer = zip.generate({ type: 'nodebuffer' })

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename=\"playing-time-sheet.docx\"`,
      },
    })
  } catch (error) {
    console.error('Error exporting docx:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
