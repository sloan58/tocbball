'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { EditModeGate } from '@/app/components/EditModeGate'
import { fetchWithAuth } from '@/app/lib/api'

const STATS = [
  { key: 'threePointer', label: '3-Pointers', emoji: '🏀' },
  { key: 'fieldGoal', label: 'Field Goals', emoji: '🎯' },
  { key: 'freeThrow', label: 'Free Throws', emoji: '⛹️' },
  { key: 'assist', label: 'Assists', emoji: '🤝' },
  { key: 'steal', label: 'Steals', emoji: '👋' },
  { key: 'rebound', label: 'Rebounds', emoji: '⬆️' },
  { key: 'turnover', label: 'Turnovers', emoji: '❌' },
  { key: 'block', label: 'Blocks', emoji: '🛡️' },
  { key: 'foul', label: 'Fouls', emoji: '⚠️' },
]

export default function PeriodStatsPage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.id as string
  const periodNumber = parseInt(params.periodNumber as string)

  const [team, setTeam] = useState<any>(null)
  const [game, setGame] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [periodPlayers, setPeriodPlayers] = useState<string[]>([])
  const [periodStats, setPeriodStats] = useState<Record<string, Record<string, number>>>({})
  const [loading, setLoading] = useState(true)
  const [updatingStat, setUpdatingStat] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [expandedPlayers, setExpandedPlayers] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const storedTeam = localStorage.getItem('team')
    if (!storedTeam) {
      router.push('/')
      return
    }

    const teamData = JSON.parse(storedTeam)
    setTeam(teamData)
    loadPeriodData(teamData.id)
  }, [router, gameId, periodNumber])

  const loadPeriodData = async (teamId: string) => {
    try {
      const [gameRes, playersRes, statsRes] = await Promise.all([
        fetch(`/api/teams/${teamId}/games/${gameId}`),
        fetch(`/api/teams/${teamId}/players`),
        fetch(`/api/teams/${teamId}/games/${gameId}/periods/${periodNumber}/stats`),
      ])

      if (!gameRes.ok || !playersRes.ok || !statsRes.ok) {
        throw new Error('Failed to load data')
      }

      const gameData = await gameRes.json()
      const playersData = await playersRes.json()
      const statsData = await statsRes.json()

      setGame(gameData)
      setPlayers(playersData)
      setPeriodStats(statsData.stats || {})

      // Get players for this period from schedule
      if (gameData.schedule) {
        const schedule = JSON.parse(gameData.schedule)
        const period = schedule.periods?.find((p: any) => p.period === periodNumber)
        if (period && period.players) {
          setPeriodPlayers(period.players)
        }
      }
    } catch (err) {
      console.error('Error loading period data:', err)
      setError('Failed to load period data')
    } finally {
      setLoading(false)
    }
  }

  const handleStatChange = async (playerId: string, statName: string, delta: number) => {
    if (!team) return

    const currentValue = periodStats[playerId]?.[statName] || 0
    const newValue = Math.max(0, currentValue + delta)
    setUpdatingStat(`${playerId}-${statName}`)

    try {
      const response = await fetchWithAuth(
        `/api/teams/${team.id}/games/${gameId}/periods/${periodNumber}/stats`,
        team.id,
        {
          method: 'PUT',
          body: JSON.stringify({
            playerId,
            statName,
            value: newValue,
          }),
        }
      )

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to update stat')
      }

      const updatedGame = await response.json()
      setGame(updatedGame)

      // Update local state
      setPeriodStats((prev) => {
        const updated = { ...prev }
        if (!updated[playerId]) {
          updated[playerId] = {}
        }
        updated[playerId] = { ...updated[playerId], [statName]: newValue }
        return updated
      })
    } catch (err: any) {
      console.error('Error updating stat:', err)
      setError(err.message || 'Failed to update stat')
    } finally {
      setUpdatingStat(null)
    }
  }

  if (loading || !team || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-700 font-medium">Loading...</div>
      </div>
    )
  }

  const playerMap = new Map(players.map((p) => [p.id, p]))
  const quarterNames = ['First', 'Second', 'Third', 'Fourth']
  const quarter = Math.ceil(periodNumber / 2)
  const periodInQuarter = ((periodNumber - 1) % 2) + 1

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <Link 
                href={`/team/games/${gameId}?scrollTo=schedule`} 
                className="text-blue-600 hover:text-blue-800 font-medium text-sm mb-2 inline-block"
              >
                ← Back to Game
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                {quarterNames[quarter - 1]} Quarter - Period {periodInQuarter}
              </h1>
              <p className="text-lg text-gray-700 mt-1">
                {new Date(game.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                {game.opponent && (
                  <span className="ml-2 font-semibold">• vs {game.opponent}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EditModeGate teamId={team.id}>
          {(isEditMode, enterEditMode) => (
            <>
              {!isEditMode && (
                <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <p className="text-gray-700 font-medium mb-3">
                    You're in view-only mode. Enter admin PIN to record stats.
                  </p>
                  <button
                    onClick={enterEditMode}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-semibold transition-colors"
                  >
                    Enter Edit Mode
                  </button>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              )}

              {periodPlayers.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <p className="text-gray-600 font-medium">No players assigned to this period yet.</p>
                  <Link 
                    href={`/team/games/${gameId}`}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm mt-4 inline-block"
                  >
                    Go to game schedule to set attendance
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {periodPlayers.map((playerId) => {
                    const player = playerMap.get(playerId)
                    if (!player) return null

                    const playerStats = periodStats[playerId] || {}
                    const isExpanded = expandedPlayers[playerId] || false

                    return (
                      <div
                        key={playerId}
                        className="bg-white rounded-lg shadow-sm border-2 border-gray-200"
                      >
                        <button
                          onClick={() => setExpandedPlayers(prev => ({ ...prev, [playerId]: !prev[playerId] }))}
                          className="w-full p-6 border-b border-gray-200 flex justify-between items-center hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-gray-900">{player.name}</h2>
                            {player.jerseyNumber && (
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-lg font-bold">
                                #{player.jerseyNumber}
                              </span>
                            )}
                          </div>
                          <span className="text-2xl text-gray-500">
                            {isExpanded ? '−' : '+'}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {STATS.map((stat) => {
                            const value = playerStats[stat.key] || 0
                            const statKey = `${playerId}-${stat.key}`
                            const isUpdating = updatingStat === statKey

                            return (
                              <div
                                key={stat.key}
                                className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl">{stat.emoji}</span>
                                    <span className="font-semibold text-gray-900">{stat.label}</span>
                                  </div>
                                  <span className="text-3xl font-bold text-gray-900">{value}</span>
                                </div>
                                {isEditMode && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleStatChange(playerId, stat.key, -1)}
                                      disabled={isUpdating || value === 0}
                                      className="flex-1 bg-red-500 text-white text-2xl font-bold py-4 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      −
                                    </button>
                                    <button
                                      onClick={() => handleStatChange(playerId, stat.key, 1)}
                                      disabled={isUpdating}
                                      className="flex-1 bg-green-500 text-white text-2xl font-bold py-4 rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                                    >
                                      +
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </EditModeGate>
      </div>
    </div>
  )
}
