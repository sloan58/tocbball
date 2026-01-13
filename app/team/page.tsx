'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function TeamPage() {
  const [team, setTeam] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [coaches, setCoaches] = useState<any[]>([])
  const [games, setGames] = useState<any[]>([])
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
        fetch(`/api/teams/${teamId}/players`),
        fetch(`/api/teams/${teamId}/coaches`),
        fetch(`/api/teams/${teamId}/games`),
      ])

      if (!playersRes.ok || !coachesRes.ok || !gamesRes.ok) {
        throw new Error('Failed to load data')
      }

      const playersData = await playersRes.json()
      const coachesData = await coachesRes.json()
      const gamesData = await gamesRes.json()

      setPlayers(playersData)
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
    router.push('/')
  }

  if (loading || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-700 font-medium">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
              <p className="text-sm text-gray-600 mt-1">Code: <span className="font-mono font-semibold text-gray-900">{team.code}</span></p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors px-4 py-2 rounded-md hover:bg-gray-100"
            >
              Switch Team
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/team/players"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-2">Players</h2>
            <p className="text-gray-700 text-lg font-medium">{players.length} active players</p>
            <p className="text-blue-600 text-sm font-medium mt-2">Manage players →</p>
          </Link>

          <Link
            href="/team/coaches"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-2">Coaches</h2>
            <p className="text-gray-700 text-lg font-medium">{coaches.length} coaches</p>
            <p className="text-blue-600 text-sm font-medium mt-2">Manage coaches →</p>
          </Link>

          <Link
            href="/team/games"
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-2">Games</h2>
            <p className="text-gray-700 text-lg font-medium">{games.length} games</p>
            <p className="text-blue-600 text-sm font-medium mt-2">Manage games →</p>
          </Link>
        </div>

        {games.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Recent Games</h2>
              <Link
                href="/team/games"
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {games.slice(0, 5).map((game: any) => {
                const attendance = JSON.parse(game.attendance || '[]')
                const hasSchedule = !!game.schedule
                return (
                  <Link
                    key={game.id}
                    href={`/team/games/${game.id}`}
                    className="block p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-gray-900 font-medium">
                          {new Date(game.date).toLocaleDateString()}
                        </span>
                        {game.opponent && (
                          <span className="ml-2 text-sm text-gray-600">vs {game.opponent}</span>
                        )}
                        {hasSchedule && (
                          <span className="ml-3 text-xs text-green-600 font-medium">✓ Schedule ready</span>
                        )}
                      </div>
                      <span className="text-sm text-gray-700 font-medium">
                        {attendance.length} players
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
