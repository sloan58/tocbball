'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { EditModeGate } from '@/app/components/EditModeGate'
import { fetchWithAuth } from '@/app/lib/api'

export default function GameDetailPage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.id as string

  const [team, setTeam] = useState<any>(null)
  const [game, setGame] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [attendance, setAttendance] = useState<string[]>([])
  const [savingAttendance, setSavingAttendance] = useState(false)
  const [editingGame, setEditingGame] = useState(false)
  const [editGameDate, setEditGameDate] = useState('')
  const [editGameOpponent, setEditGameOpponent] = useState('')
  const [savingGame, setSavingGame] = useState(false)
  const [updatingPeriod, setUpdatingPeriod] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    gameInfo: false,
    attendance: false,
    schedule: true, // Schedule expanded by default since it's the primary action
  })

  useEffect(() => {
    const storedTeam = localStorage.getItem('team')
    if (!storedTeam) {
      router.push('/')
      return
    }

    const teamData = JSON.parse(storedTeam)
    setTeam(teamData)
    loadGameData(teamData.id)

    // Scroll to schedule section if coming from stats page
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('scrollTo') === 'schedule') {
      setTimeout(() => {
        const scheduleSection = document.getElementById('schedule-section')
        if (scheduleSection) {
          scheduleSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
          // Expand schedule section if collapsed
          setExpandedSections(prev => ({ ...prev, schedule: true }))
        }
      }, 100)
    }
  }, [router, gameId])

  const loadGameData = async (teamId: string) => {
    try {
      const [gameRes, playersRes] = await Promise.all([
        fetch(`/api/teams/${teamId}/games/${gameId}`),
        fetch(`/api/teams/${teamId}/players`),
      ])

      if (!gameRes.ok || !playersRes.ok) throw new Error('Failed to load data')

      const gameData = await gameRes.json()
      const playersData = await playersRes.json()

      // Ensure schedule periods have status field (with backward compatibility)
      if (gameData.schedule) {
        const scheduleData = JSON.parse(gameData.schedule)
        if (scheduleData.periods) {
          scheduleData.periods = scheduleData.periods.map((p: any) => {
            // Backward compatibility: convert completed boolean to status
            if (!p.status) {
              p.status = p.completed ? 'completed' : 'not_started'
              p.completed = p.completed || false
            }
            return p
          })
          gameData.schedule = JSON.stringify(scheduleData)
        }
      }
      
      setGame(gameData)
      setPlayers(playersData)
      setAttendance(JSON.parse(gameData.attendance || '[]'))
      
      // Set edit form values - format date for datetime-local input
      const date = new Date(gameData.date)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      setEditGameDate(`${year}-${month}-${day}T${hours}:${minutes}`)
      setEditGameOpponent(gameData.opponent || '')
    } catch (err) {
      console.error('Error loading game data:', err)
      setError('Failed to load game data')
    } finally {
      setLoading(false)
    }
  }

  const handleAttendanceChange = async (playerId: string, checked: boolean, teamId: string) => {
    // Update local state immediately for responsive UI
    const newAttendance = checked
      ? [...attendance, playerId]
      : attendance.filter((id) => id !== playerId)
    setAttendance(newAttendance)
    setSavingAttendance(true)
    
    // Save immediately
    try {
      const response = await fetchWithAuth(
        `/api/teams/${teamId}/games/${gameId}/attendance`,
        teamId,
        {
          method: 'PUT',
          body: JSON.stringify({ attendance: newAttendance }),
        }
      )

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to save attendance')
      }

      const updatedGame = await response.json()
      setGame(updatedGame)
    } catch (err: any) {
      console.error('Error saving attendance:', err)
      // Revert on error
      setAttendance(attendance)
      setError(err.message || 'Failed to save attendance')
    } finally {
      setSavingAttendance(false)
    }
  }

  const handleSelectAllAttendance = async (selectAll: boolean, teamId: string) => {
    const newAttendance = selectAll ? players.map(p => p.id) : []
    setAttendance(newAttendance)
    setSavingAttendance(true)
    
    // Save immediately
    try {
      const response = await fetchWithAuth(
        `/api/teams/${teamId}/games/${gameId}/attendance`,
        teamId,
        {
          method: 'PUT',
          body: JSON.stringify({ attendance: newAttendance }),
        }
      )

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to save attendance')
      }

      const updatedGame = await response.json()
      setGame(updatedGame)
    } catch (err: any) {
      console.error('Error saving attendance:', err)
      // Revert on error
      setAttendance(attendance)
      setError(err.message || 'Failed to save attendance')
    } finally {
      setSavingAttendance(false)
    }
  }

  const handleUpdateGame = async (teamId: string) => {
    setError('')
    setSavingGame(true)

    try {
      const response = await fetchWithAuth(
        `/api/teams/${teamId}/games/${gameId}`,
        teamId,
        {
          method: 'PUT',
          body: JSON.stringify({
            date: editGameDate,
            opponent: editGameOpponent || null,
          }),
        }
      )

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to update game')
      }

      const updatedGame = await response.json()
      setGame(updatedGame)
      setEditingGame(false)
    } catch (err: any) {
      setError(err.message || 'Failed to update game')
    } finally {
      setSavingGame(false)
    }
  }

  const handlePeriodStatusChange = async (teamId: string, periodNumber: number, status: string) => {
    setUpdatingPeriod(periodNumber)
    try {
      const response = await fetchWithAuth(
        `/api/teams/${teamId}/games/${gameId}/schedule/period`,
        teamId,
        {
          method: 'PUT',
          body: JSON.stringify({
            period: periodNumber,
            status,
          }),
        }
      )

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to update period status')
      }

      const updatedGame = await response.json()
      setGame(updatedGame)
    } catch (err: any) {
      console.error('Error updating period status:', err)
      // Don't show error to user for this - it's not critical
    } finally {
      setUpdatingPeriod(null)
    }
  }


  if (loading || !team || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-700 font-medium">Loading...</div>
      </div>
    )
  }

  const schedule = game.schedule ? JSON.parse(game.schedule) : null
  const playerMap = new Map(players.map((p) => [p.id, p]))
  
  // Calculate how many periods each player appears in (total count)
  const playerPeriodCounts = new Map<string, number>()
  // Track occurrence number for each player as we go through periods in order
  const playerOccurrenceCounters = new Map<string, number>()
  
  if (schedule && schedule.periods) {
    // Count total appearances per player
    schedule.periods.forEach((period: any) => {
      period.players.forEach((playerId: string) => {
        playerPeriodCounts.set(playerId, (playerPeriodCounts.get(playerId) || 0) + 1)
      })
    })
    
    // Initialize occurrence counters
    playerPeriodCounts.forEach((_, playerId) => {
      playerOccurrenceCounters.set(playerId, 0)
    })
  }
  
  // Helper function to get occurrence number for a player in a specific period
  const getPlayerOccurrence = (periodNumber: number, playerId: string): number => {
    if (!schedule || !schedule.periods) return 0
    let occurrence = 0
    for (let i = 1; i <= periodNumber; i++) {
      const period = schedule.periods.find((p: any) => p.period === i)
      if (period && period.players.includes(playerId)) {
        occurrence++
      }
    }
    return occurrence
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/team/games" className="text-blue-600 hover:text-blue-800 font-medium text-sm mb-2 inline-block">
                ← Back to Games
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Game Details</h1>
              <p className="text-lg text-gray-700 mt-1">
                {new Date(game.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {new Date(game.date).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
                {game.opponent && (
                  <span className="ml-2 font-semibold text-gray-900">• vs {game.opponent}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EditModeGate teamId={team.id}>
          {(isEditMode, enterEditMode) => (
            <>
              {!isEditMode && (
                <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <p className="text-gray-700 font-medium mb-3">
                    You're in view-only mode. Enter admin PIN to mark attendance or generate schedule.
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

                  {/* Game Details Edit Section */}
                  {isEditMode && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                      <button
                        onClick={() => setExpandedSections(prev => ({ ...prev, gameInfo: !prev.gameInfo }))}
                        className="w-full p-6 border-b border-gray-200 flex justify-between items-center hover:bg-gray-50 transition-colors"
                      >
                        <h2 className="text-2xl font-bold text-gray-900">Game Information</h2>
                        <span className="text-2xl text-gray-500">
                          {expandedSections.gameInfo ? '−' : '+'}
                        </span>
                      </button>
                      {expandedSections.gameInfo && (
                        <div>
                          {editingGame ? (
                    <div className="p-6">
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="edit-date" className="block text-sm font-semibold text-gray-900 mb-2">
                            Game Date & Time *
                          </label>
                          <input
                            id="edit-date"
                            type="datetime-local"
                            value={editGameDate}
                            onChange={(e) => setEditGameDate(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="edit-opponent" className="block text-sm font-semibold text-gray-900 mb-2">
                            Opponent (optional)
                          </label>
                          <input
                            id="edit-opponent"
                            type="text"
                            value={editGameOpponent}
                            onChange={(e) => setEditGameOpponent(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                            placeholder="Team Name"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleUpdateGame(team.id)}
                            disabled={savingGame || !editGameDate}
                            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-semibold transition-colors"
                          >
                            {savingGame ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingGame(false)
                              // Reset form values to current game values
                              const date = new Date(game.date)
                              const year = date.getFullYear()
                              const month = String(date.getMonth() + 1).padStart(2, '0')
                              const day = String(date.getDate()).padStart(2, '0')
                              const hours = String(date.getHours()).padStart(2, '0')
                              const minutes = String(date.getMinutes()).padStart(2, '0')
                              setEditGameDate(`${year}-${month}-${day}T${hours}:${minutes}`)
                              setEditGameOpponent(game.opponent || '')
                              setError('')
                            }}
                            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Date:</span>
                            <span className="ml-2 text-gray-900 font-medium">
                              {new Date(game.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-gray-600">Time:</span>
                            <span className="ml-2 text-gray-900 font-medium">
                              {new Date(game.date).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {game.opponent && (
                            <div>
                              <span className="text-sm font-semibold text-gray-600">Opponent:</span>
                              <span className="ml-2 text-gray-900 font-medium">{game.opponent}</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            // Ensure form values are set when opening edit mode
                            if (!editGameDate && game) {
                              const date = new Date(game.date)
                              const year = date.getFullYear()
                              const month = String(date.getMonth() + 1).padStart(2, '0')
                              const day = String(date.getDate()).padStart(2, '0')
                              const hours = String(date.getHours()).padStart(2, '0')
                              const minutes = String(date.getMinutes()).padStart(2, '0')
                              setEditGameDate(`${year}-${month}-${day}T${hours}:${minutes}`)
                              setEditGameOpponent(game.opponent || '')
                            }
                            setEditingGame(true)
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-semibold transition-colors"
                        >
                          Edit Game
                        </button>
                      </div>
                      {(() => {
                        // Calculate total game stats
                        const allStats = game.stats ? JSON.parse(game.stats) : {}
                        const totalStats: Record<string, number> = {
                          threePointer: 0,
                          fieldGoal: 0,
                          freeThrow: 0,
                          assist: 0,
                          steal: 0,
                          rebound: 0,
                          turnover: 0,
                          block: 0,
                          foul: 0,
                        }
                        
                        Object.values(allStats).forEach((periodStats: any) => {
                          Object.values(periodStats).forEach((playerStats: any) => {
                            Object.entries(playerStats).forEach(([statName, value]: [string, any]) => {
                              if (totalStats[statName] !== undefined) {
                                totalStats[statName] += value || 0
                              }
                            })
                          })
                        })
                        
                        const hasStats = Object.values(totalStats).some(v => v > 0)
                        
                        if (!hasStats) return null
                        
                        const statLabels: Record<string, string> = {
                          threePointer: '3-Pointers',
                          fieldGoal: 'Field Goals',
                          freeThrow: 'Free Throws',
                          assist: 'Assists',
                          steal: 'Steals',
                          rebound: 'Rebounds',
                          turnover: 'Turnovers',
                          block: 'Blocks',
                          foul: 'Fouls',
                        }
                        
                        return (
                          <div className="mt-6 pt-6 border-t border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Game Stats</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                              {Object.entries(totalStats)
                                .filter(([_, value]) => value > 0)
                                .map(([statKey, value]) => (
                                  <div key={statKey} className="text-center">
                                    <div className="text-2xl font-bold text-gray-900">{value}</div>
                                    <div className="text-sm text-gray-600">{statLabels[statKey]}</div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                        </div>
                      )}
                    </div>
                  )}

              {/* Attendance Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <button
                  onClick={() => setExpandedSections(prev => ({ ...prev, attendance: !prev.attendance }))}
                  className="w-full p-6 border-b border-gray-200 flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Attendance</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {attendance.length} of {players.length} players marked
                      </p>
                    </div>
                        {isEditMode && players.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectAllAttendance(attendance.length !== players.length, team.id)
                            }}
                            disabled={savingAttendance}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 font-medium transition-colors text-sm disabled:opacity-50"
                          >
                            {attendance.length === players.length ? 'Deselect All' : 'Select All'}
                          </button>
                        )}
                  </div>
                    <span className="text-2xl text-gray-500 ml-4">
                      {expandedSections.attendance ? '−' : '+'}
                    </span>
                </button>
                {expandedSections.attendance && (
                  <div className="p-6">
                  {players.length === 0 ? (
                    <p className="text-gray-600 font-medium">No players on the team yet.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {players.map((player) => {
                          const isPresent = attendance.includes(player.id)
                          return (
                            <label
                              key={player.id}
                              className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                                isPresent
                                  ? 'border-green-500 bg-green-50'
                                  : 'border-gray-200 bg-white hover:bg-gray-50'
                              } ${!isEditMode ? 'cursor-not-allowed opacity-60' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isPresent}
                                onChange={(e) => handleAttendanceChange(player.id, e.target.checked, team.id)}
                                disabled={!isEditMode || savingAttendance}
                                className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 mr-3"
                              />
                              <div>
                                <div className="font-semibold text-gray-900">{player.name}</div>
                                {player.jerseyNumber && (
                                  <div className="text-sm text-gray-600">
                                    #{player.jerseyNumber}
                                  </div>
                                )}
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </>
                  )}
                  </div>
                )}
              </div>

                  {/* Schedule Section */}
                  {schedule && schedule.periods && (
                    <div id="schedule-section" className="bg-white rounded-lg shadow-sm border border-gray-200">
                      <button
                        onClick={() => setExpandedSections(prev => ({ ...prev, schedule: !prev.schedule }))}
                        className="w-full p-6 border-b border-gray-200 flex justify-between items-center hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">Playing Time Schedule</h2>
                          <p className="text-sm text-gray-600 mt-1">4 quarters, 2 periods per quarter, 5 players per period</p>
                        </div>
                        <span className="text-2xl text-gray-500">
                          {expandedSections.schedule ? '−' : '+'}
                        </span>
                      </button>
                      {expandedSections.schedule && (
                        <div>
                  <div className="p-6">
                    <div className="space-y-6">
                      {[
                        { quarter: 'First Quarter', periods: [1, 2] },
                        { quarter: 'Second Quarter', periods: [3, 4] },
                        { quarter: 'Third Quarter', periods: [5, 6] },
                        { quarter: 'Fourth Quarter', periods: [7, 8] },
                      ].map(({ quarter, periods }) => {
                          const period1 = schedule.periods.find((p: any) => p.period === periods[0])
                          const period2 = schedule.periods.find((p: any) => p.period === periods[1])
                        return (
                          <div
                            key={quarter}
                            className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50"
                          >
                            <h3 className="font-bold text-lg text-gray-900 mb-4 text-center">
                              {quarter}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Period 1 within quarter */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-sm text-gray-700">1</h4>
                                  <div className="flex items-center gap-2">
                                    {isEditMode && period1 && (() => {
                                      const status = period1.status || (period1.completed ? 'completed' : 'not_started')
                                      if (status === 'started') {
                                        return (
                                          <Link
                                            href={`/team/games/${gameId}/periods/${periods[0]}`}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                          >
                                            Stats
                                          </Link>
                                        )
                                      }
                                      return null
                                    })()}
                                    {isEditMode && period1 && (
                                      <select
                                        value={period1.status || (period1.completed ? 'completed' : 'not_started')}
                                        onChange={(e) => handlePeriodStatusChange(team.id, periods[0], e.target.value)}
                                        disabled={updatingPeriod === periods[0]}
                                        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      >
                                        <option value="not_started">Not Started</option>
                                        <option value="started">Started</option>
                                        <option value="completed">Completed</option>
                                      </select>
                                    )}
                                    {!isEditMode && period1 && (() => {
                                      const status = period1.status || (period1.completed ? 'completed' : 'not_started')
                                      // Don't show status text for 'not_started' periods
                                      if (status === 'not_started') return null
                                      return (
                                        <span className="text-xs text-gray-600 capitalize">
                                          {status}
                                        </span>
                                      )
                                    })()}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  {period1?.players.map((playerId: string) => {
                                    const player = playerMap.get(playerId)
                                    const totalPeriods = playerPeriodCounts.get(playerId) || 0
                                    const occurrence = getPlayerOccurrence(periods[0], playerId)
                                    const periodStatus = period1.status || (period1.completed ? 'completed' : 'not_started')
                                    return (
                                      <div
                                        key={playerId}
                                        className={`p-2 rounded border-2 ${
                                          periodStatus === 'completed'
                                            ? 'bg-green-50 border-green-300'
                                            : periodStatus === 'started'
                                            ? 'bg-blue-50 border-blue-300'
                                            : 'bg-white border-gray-200'
                                        }`}
                                      >
                                        <div className={`font-medium text-sm ${
                                          periodStatus === 'completed' ? 'text-gray-600' : 'text-gray-900'
                                        }`}>
                                          {player?.name || 'Unknown Player'}
                                          {periodStatus === 'completed' && (
                                            <span className="ml-2 text-green-600">✓</span>
                                          )}
                                        </div>
                                        {player?.jerseyNumber && (
                                          <div className={`text-xs ${
                                            periodStatus === 'completed' ? 'text-gray-500' : 'text-gray-600'
                                          }`}>
                                            #{player.jerseyNumber}
                                          </div>
                                        )}
                                        <div className={`text-xs mt-1 ${
                                          periodStatus === 'completed' ? 'text-gray-500' : 'text-gray-500'
                                        }`}>
                                          Period {occurrence} of {totalPeriods}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                              {/* Period 2 within quarter */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-sm text-gray-700">2</h4>
                                  <div className="flex items-center gap-2">
                                    {isEditMode && period2 && (() => {
                                      const status = period2.status || (period2.completed ? 'completed' : 'not_started')
                                      if (status === 'started') {
                                        return (
                                          <Link
                                            href={`/team/games/${gameId}/periods/${periods[1]}`}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                          >
                                            Stats
                                          </Link>
                                        )
                                      }
                                      return null
                                    })()}
                                    {isEditMode && period2 && (
                                      <select
                                        value={period2.status || (period2.completed ? 'completed' : 'not_started')}
                                        onChange={(e) => handlePeriodStatusChange(team.id, periods[1], e.target.value)}
                                        disabled={updatingPeriod === periods[1]}
                                        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      >
                                        <option value="not_started">Not Started</option>
                                        <option value="started">Started</option>
                                        <option value="completed">Completed</option>
                                      </select>
                                    )}
                                    {!isEditMode && period2 && (() => {
                                      const status = period2.status || (period2.completed ? 'completed' : 'not_started')
                                      // Don't show status text for 'not_started' periods
                                      if (status === 'not_started') return null
                                      return (
                                        <span className="text-xs text-gray-600 capitalize">
                                          {status}
                                        </span>
                                      )
                                    })()}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  {period2?.players.map((playerId: string) => {
                                    const player = playerMap.get(playerId)
                                    const totalPeriods = playerPeriodCounts.get(playerId) || 0
                                    const occurrence = getPlayerOccurrence(periods[1], playerId)
                                    const periodStatus = period2.status || (period2.completed ? 'completed' : 'not_started')
                                    return (
                                      <div
                                        key={playerId}
                                        className={`p-2 rounded border-2 ${
                                          periodStatus === 'completed'
                                            ? 'bg-green-50 border-green-300'
                                            : periodStatus === 'started'
                                            ? 'bg-blue-50 border-blue-300'
                                            : 'bg-white border-gray-200'
                                        }`}
                                      >
                                        <div className={`font-medium text-sm ${
                                          periodStatus === 'completed' ? 'text-gray-600' : 'text-gray-900'
                                        }`}>
                                          {player?.name || 'Unknown Player'}
                                          {periodStatus === 'completed' && (
                                            <span className="ml-2 text-green-600">✓</span>
                                          )}
                                        </div>
                                        {player?.jerseyNumber && (
                                          <div className={`text-xs ${
                                            periodStatus === 'completed' ? 'text-gray-500' : 'text-gray-600'
                                          }`}>
                                            #{player.jerseyNumber}
                                          </div>
                                        )}
                                        <div className={`text-xs mt-1 ${
                                          periodStatus === 'completed' ? 'text-gray-500' : 'text-gray-500'
                                        }`}>
                                          Period {occurrence} of {totalPeriods}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                        </div>
                      )}
                    </div>
                  )}
            </>
          )}
        </EditModeGate>
      </div>
    </div>
  )
}
