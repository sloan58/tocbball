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

const toFilenamePart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const replaceAfterLabel = (xml: string, label: string, value: string) => {
  const pattern = new RegExp(
    `(<w:t[^>]*>\\s*${escapeRegExp(label)}:<\\/w:t><\\/w:r><w:r[^>]*><w:rPr>[\\s\\S]*?<w:u[^>]*\\/?>[\\s\\S]*?<\\/w:rPr>)<w:tab\\/>`
  )
  if (!pattern.test(xml)) return xml
  return xml.replace(pattern, `$1<w:t xml:space="preserve"> ${escapeXml(value)}</w:t>`)
}

const replaceAfterLabelAtIndex = (
  xml: string,
  label: string,
  value: string,
  index: number
) => {
  const pattern = new RegExp(
    `(<w:t[^>]*>\\s*${escapeRegExp(label)}:<\\/w:t><\\/w:r><w:r[^>]*><w:rPr>[\\s\\S]*?<w:u[^>]*\\/?>[\\s\\S]*?<\\/w:rPr>)<w:tab\\/>`
  )
  let count = 0
  return xml.replace(pattern, (match, prefix) => {
    if (count !== index) {
      count += 1
      return match
    }
    count += 1
    return `${prefix}<w:t xml:space="preserve"> ${escapeXml(value)}</w:t>`
  })
}

const replaceAfterLabelAtIndexWithTab = (
  xml: string,
  label: string,
  value: string,
  index: number,
  leadingSpace = true
) => {
  const pattern = new RegExp(
    `(<w:t[^>]*>\\s*${escapeRegExp(label)}:<\\/w:t><\\/w:r><w:r[^>]*><w:rPr>[\\s\\S]*?<w:u[^>]*\\/?>[\\s\\S]*?<\\/w:rPr>)<w:tab\\/>`
  )
  let count = 0
  return xml.replace(pattern, (match, prefix) => {
    if (count !== index) {
      count += 1
      return match
    }
    count += 1
    const spacer = leadingSpace ? ' ' : ''
    return `${prefix}<w:t xml:space="preserve">${spacer}${escapeXml(value)}</w:t><w:tab/>`
  })
}

const insertAbsentPlayersLine = (xml: string, value: string) => {
  if (!value) return xml
  const paragraphPattern = /<w:p[\s\S]*?\(head\):[\s\S]*?<\/w:p>/
  return xml.replace(paragraphPattern, (paragraph) => {
    const headIndex = paragraph.indexOf('(head):')
    if (headIndex === -1) return paragraph
    const beforeHead = paragraph.slice(0, headIndex)
    const afterHead = paragraph.slice(headIndex)
    const underlineTabPattern =
      /(<w:r[^>]*><w:rPr>[\s\S]*?<w:u[^>]*\/>[\s\S]*?<\/w:rPr>)<w:tab\/>/
    if (!underlineTabPattern.test(beforeHead)) return paragraph
    const updatedBefore = beforeHead.replace(
      underlineTabPattern,
      `$1<w:t xml:space="preserve">${escapeXml(value)}</w:t><w:tab/>`
    )
    return `${updatedBefore}${afterHead}`
  })
}

const setCellText = (cellXml: string, text: string) => {
  const textTag = `<w:t${text.startsWith(' ') ? ' xml:space="preserve"' : ''}>${escapeXml(
    text
  )}</w:t>`
  const textPattern = /<w:t(?=[\s>])[^>]*>[\s\S]*?<\/w:t>/
  if (textPattern.test(cellXml)) {
    if (!text) {
      return cellXml.replace(textPattern, '<w:t></w:t>')
    }
    return cellXml.replace(textPattern, textTag)
  }
  if (!text) return cellXml
  const paragraphRprMatch = cellXml.match(
    /<w:pPr>[\s\S]*?<w:rPr>([\s\S]*?)<\/w:rPr>[\s\S]*?<\/w:pPr>/
  )
  const runProps = paragraphRprMatch ? `<w:rPr>${paragraphRprMatch[1]}</w:rPr>` : ''
  return cellXml.replace(/<\/w:p>/, `<w:r>${runProps}${textTag}</w:r></w:p>`)
}

const fillPlayerRow = (
  rowXml: string,
  player: { id: string; name: string; jerseyNumber: number | null } | null,
  periodsByPlayer: Map<string, Set<number>>,
  jerseyNumberOverride?: number
) => {
  const cells = rowXml.match(/<w:tc[\s\S]*?<\/w:tc>/g)
  if (!cells || cells.length < 10) return rowXml

  const jerseyNumber =
    typeof jerseyNumberOverride === 'number'
      ? jerseyNumberOverride
      : player?.jerseyNumber ?? null
  const jersey = jerseyNumber ? String(jerseyNumber) : ''
  cells[0] = setCellText(cells[0], jersey)
  cells[1] = setCellText(cells[1], player?.name || '')

  const playerPeriods = player ? periodsByPlayer.get(player.id) : undefined
  for (let i = 0; i < 8; i += 1) {
    const periodNumber = i + 1
    const mark = playerPeriods?.has(periodNumber) ? 'X' : ''
    cells[2 + i] = setCellText(cells[2 + i], mark)
  }

  let cellIndex = 0
  return rowXml.replace(/<w:tc[\s\S]*?<\/w:tc>/g, () => cells[cellIndex++] ?? '')
}

const tightenGymAttendantLine = (xml: string) => {
  const pattern = /<w:p[\s\S]*?Gym Attendant\/Scorekeeper[\s\S]*?<\/w:p>/
  if (!pattern.test(xml)) return xml
  return xml.replace(pattern, (paragraph) => {
    let updated = paragraph.replace(/w:line="360"/g, 'w:line="320"')
    updated = updated.replace(/<w:sz w:val="18"\/>/g, '<w:sz w:val="17"/>')
    updated = updated.replace(/<w:szCs w:val="18"\/>/g, '<w:szCs w:val="17"/>')
    return updated
  })
}

const isPlayerRow = (rowXml: string) => {
  if (rowXml.includes('Quarter') || rowXml.includes('No.</w:t>')) return false
  const cells = rowXml.match(/<w:tc[\s\S]*?<\/w:tc>/g)
  if (!cells || cells.length < 10) return false
  const firstCell = cells[0]
  return /<w:t[^>]*>\d+<\/w:t>/.test(firstCell)
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
      select: { date: true, opponent: true, location: true, attendance: true, schedule: true },
    })
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const [players, coaches] = await Promise.all([
      db.player.findMany({
        where: { teamId, active: true },
        select: { id: true, name: true, jerseyNumber: true },
        orderBy: [{ jerseyNumber: 'asc' }, { name: 'asc' }],
      }),
      db.coach.findMany({
        where: { teamId },
        select: { name: true, type: true },
        orderBy: { name: 'asc' },
      }),
    ])

    const templateBuffer = await fs.readFile(TEMPLATE_PATH)
    const zip = new PizZip(templateBuffer)
    const documentXml = zip.file('word/document.xml')?.asText()
    if (!documentXml) {
      return NextResponse.json({ error: 'Template not found' }, { status: 500 })
    }

    const formattedDate = new Date(game.date).toLocaleDateString('en-US')

    const attendance = Array.isArray(game.attendance)
      ? game.attendance
      : (JSON.parse(game.attendance || '[]') as string[])
    const schedule =
      typeof game.schedule === 'string' ? JSON.parse(game.schedule) : game.schedule

    const periodsByPlayer = new Map<string, Set<number>>()
    if (schedule?.periods) {
      schedule.periods.forEach((period: any) => {
        period.players.forEach((playerId: string) => {
          if (!periodsByPlayer.has(playerId)) {
            periodsByPlayer.set(playerId, new Set())
          }
          periodsByPlayer.get(playerId)!.add(period.period)
        })
      })
    }

    const headCoach = coaches.find((coach) => coach.type === 'head')?.name || ''
    const assistantCoaches = coaches
      .filter((coach) => coach.type === 'assistant')
      .map((coach) => coach.name)

    const absentPlayers =
      attendance.length > 0
        ? players
            .filter((player) => !attendance.includes(player.id))
            .map((player) =>
              player.jerseyNumber ? `${player.name} (#${player.jerseyNumber})` : player.name
            )
            .join(', ')
        : ''

    let updatedXml = documentXml
    updatedXml = replaceAfterLabel(updatedXml, 'TEAM', team.name)
    updatedXml = replaceAfterLabel(updatedXml, 'OPPOSING TEAM', game.opponent)
    updatedXml = replaceAfterLabel(updatedXml, 'LEAGUE', team.league)
    updatedXml = replaceAfterLabel(updatedXml, 'LOCATION', game.location)
    updatedXml = replaceAfterLabel(updatedXml, 'DATE', formattedDate)
    updatedXml = replaceAfterLabelAtIndexWithTab(
      updatedXml,
      '(head)',
      headCoach,
      0,
      false
    )
    updatedXml = replaceAfterLabelAtIndexWithTab(
      updatedXml,
      '(asst)',
      assistantCoaches[0] || '',
      0,
      false
    )
    updatedXml = replaceAfterLabelAtIndexWithTab(
      updatedXml,
      '(asst)',
      assistantCoaches[1] || '',
      1,
      false
    )

    const jerseySlots = [1, 2, 3, 4, 5, 10, 11, 12, 13, 14]
    const playersByNumber = new Map<number, (typeof players)[number]>()
    players.forEach((player) => {
      if (typeof player.jerseyNumber === 'number') {
        playersByNumber.set(player.jerseyNumber, player)
      }
    })

    let jerseyIndex = 0
    updatedXml = updatedXml.replace(/<w:tr[\s\S]*?<\/w:tr>/g, (rowXml) => {
      if (!isPlayerRow(rowXml)) return rowXml
      const jerseyNumber = jerseySlots[jerseyIndex]
      const player = jerseyNumber ? playersByNumber.get(jerseyNumber) ?? null : null
      jerseyIndex += 1
      return fillPlayerRow(rowXml, player, periodsByPlayer, jerseyNumber)
    })

    updatedXml = insertAbsentPlayersLine(updatedXml, absentPlayers)
    updatedXml = tightenGymAttendantLine(updatedXml)


    zip.file('word/document.xml', updatedXml)
    const outputBuffer = zip.generate({ type: 'nodebuffer' })
    const body = new Uint8Array(outputBuffer)

    const datePart = formattedDate.replace(/\//g, '-')
    const filename = `${toFilenamePart(team.name)}-vs-${toFilenamePart(
      game.opponent
    )}-playing-time-${datePart}.docx`

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename=\"${filename}\"`,
      },
    })
  } catch (error) {
    console.error('Error exporting docx:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
