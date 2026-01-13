'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Team, Player, Coach, Game } from '@tocbball/shared'
import { EditModeGate } from '../components/EditModeGate'
import { clearAdminPin } from '../lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export default function TeamPage() {
  const [team, setTeam] = useState<Team | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const storedTeam = localStorage.getItem('team')
    if (!storedTeam) {
      router.push('/')
      return
    }

    const teamData = JSON.parse(storedTeam)
    setTeam(teamData)
    loadData(teamData.id)
  }, [router])

  const loadData = async (teamId: string) => {
    try {
      const [playersRes, coachesRes, gamesRes] = await Promise.all([
        fetch(`${API_URL}/teams/${teamId}/players`),
        fetch(`${API_URL}/teams/${teamId}/coaches`),
        fetch(`${API_URL}/teams/${teamId}/games`),
      ])

      const playersData = await playersRes.json()
      const coachesData = await coachesRes.json()
      const gamesData = await gamesRes.json()

      setPlayers(playersData.filter((p: Player) => p.active))
      setCoaches(coachesData)
      setGames(gamesData)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('team')
    if (team) {
      clearAdminPin(team.id)
    }
    router.push('/')
  }

  if (loading || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <EditModeGate teamId={team.id}>
      {(isEditMode, enterEditMode) => (
        <div className="min-h-screen bg-gray-50">
          <div className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold">{team.name}</h1>
                  <p className="text-sm text-gray-500">Code: {team.code}</p>
                </div>
                <div className="flex gap-4 items-center">
                  {isEditMode ? (
                    <span className="text-sm text-green-600 font-medium">Edit Mode</span>
                  ) : (
                    <button
                      onClick={enterEditMode}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Enter Edit Mode
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Switch Team
                  </button>
                </div>
              </div>
            </div>
          </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/team/players"
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold mb-2">Players</h2>
            <p className="text-gray-600">{players.length} active players</p>
          </Link>

          <Link
            href="/team/coaches"
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold mb-2">Coaches</h2>
            <p className="text-gray-600">{coaches.length} coaches</p>
          </Link>

          <Link
            href="/team/games"
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold mb-2">Games</h2>
            <p className="text-gray-600">{games.length} games</p>
          </Link>
        </div>

        {games.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Games</h2>
            <div className="space-y-2">
              {games.slice(0, 5).map((game) => (
                <Link
                  key={game.id}
                  href={`/team/games/${game.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex justify-between">
                    <span>{new Date(game.date).toLocaleDateString()}</span>
                    <span className="text-sm text-gray-500">
                      {game.attendance.length} players
                    </span>
                  </div>
                </Link>
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
