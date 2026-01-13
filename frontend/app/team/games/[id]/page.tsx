'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import type { Team, Game, Player, Schedule } from '@tocbball/shared'
import { EditModeGate } from '../../../components/EditModeGate'
import { fetchWithAuth } from '../../../lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export default function GamePage() {
  const [team, setTeam] = useState<Team | null>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const router = useRouter()
  const params = useParams()
  const gameId = params.id as string

  useEffect(() => {
    const storedTeam = localStorage.getItem('team')
    if (!storedTeam) {
      router.push('/')
      return
    }

    const teamData = JSON.parse(storedTeam)
    setTeam(teamData)
    loadData(teamData.id)
  }, [router, gameId])

  const loadData = async (teamId: string) => {
    try {
      const [gameRes, playersRes] = await Promise.all([
        fetch(`${API_URL}/teams/${teamId}/games/${gameId}`),
        fetch(`${API_URL}/teams/${teamId}/players`),
      ])

      const gameData = await gameRes.json()
      const playersData = await playersRes.json()

      setGame(gameData)
      setPlayers(playersData.filter((p: Player) => p.active))
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAttendanceChange = async (playerId: string, checked: boolean) => {
    if (!team || !game) return

    const newAttendance = checked
      ? [...game.attendance, playerId]
      : game.attendance.filter((id) => id !== playerId)

    try {
      const response = await fetchWithAuth(
        `${API_URL}/teams/${team.id}/games/${gameId}/attendance`,
        team.id,
        {
          method: 'PUT',
          body: JSON.stringify({ attendance: newAttendance }),
        }
      )

      if (response.ok) {
        const updatedGame = await response.json()
        setGame(updatedGame)
      } else if (response.status === 401) {
        alert('Please enter edit mode to make changes')
      }
    } catch (err) {
      console.error('Error updating attendance:', err)
    }
  }

  const handleGenerateSchedule = async () => {
    if (!team || !game || game.attendance.length === 0) return

    setGenerating(true)
    try {
      const response = await fetchWithAuth(
        `${API_URL}/teams/${team.id}/games/${gameId}/schedule`,
        team.id,
        {
          method: 'POST',
        }
      )

      if (response.ok) {
        const updatedGame = await response.json()
        setGame(updatedGame)
      } else if (response.status === 401) {
        alert('Please enter edit mode to make changes')
      }
    } catch (err) {
      console.error('Error generating schedule:', err)
    } finally {
      setGenerating(false)
    }
  }

  if (loading || !team || !game) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const attendanceSet = new Set(game.attendance)
  const playerMap = new Map(players.map((p) => [p.id, p]))

  return (
    <EditModeGate teamId={team.id}>
      {(isEditMode, enterEditMode) => (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
              <Link href="/team/games" className="text-blue-600 hover:text-blue-700">
                ← Back to Games
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h1 className="text-2xl font-bold mb-2">
                Game - {new Date(game.date).toLocaleDateString()}
              </h1>
              <p className="text-gray-600">
                {game.attendance.length} of {players.length} players present
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Attendance</h2>
                {!isEditMode && (
                  <button
                    onClick={enterEditMode}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Enter Edit Mode
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {players.map((player) => (
                  <label
                    key={player.id}
                    className={`flex items-center p-3 border rounded-lg hover:bg-gray-50 ${
                      isEditMode ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={attendanceSet.has(player.id)}
                      onChange={(e) => handleAttendanceChange(player.id, e.target.checked)}
                      disabled={!isEditMode}
                      className="mr-3 w-5 h-5"
                    />
                    <span>
                      {player.jerseyNumber && `#${player.jerseyNumber} `}
                      {player.name}
                    </span>
                  </label>
                ))}
              </div>

              {game.attendance.length > 0 && isEditMode && (
                <button
                  onClick={handleGenerateSchedule}
                  disabled={generating || !!game.schedule}
                  className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating
                    ? 'Generating...'
                    : game.schedule
                    ? 'Schedule Generated'
                    : 'Generate Schedule'}
                </button>
              )}
            </div>

        {game.schedule && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Playing Time Schedule</h2>
            <div className="space-y-4">
              {game.schedule.periods.map((period) => (
                <div key={period.period} className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Period {period.period}</h3>
                  <div className="flex flex-wrap gap-2">
                    {period.players.map((playerId) => {
                      const player = playerMap.get(playerId)
                      return (
                        <span
                          key={playerId}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded"
                        >
                          {player?.jerseyNumber && `#${player.jerseyNumber} `}
                          {player?.name || playerId}
                        </span>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
      )}
    </EditModeGate>
  )
}
