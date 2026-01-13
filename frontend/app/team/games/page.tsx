'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Team, Game } from '@tocbball/shared'
import { EditModeGate } from '../../components/EditModeGate'
import { fetchWithAuth } from '../../lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export default function GamesPage() {
  const [team, setTeam] = useState<Team | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [date, setDate] = useState('')
  const router = useRouter()

  useEffect(() => {
    const storedTeam = localStorage.getItem('team')
    if (!storedTeam) {
      router.push('/')
      return
    }

    const teamData = JSON.parse(storedTeam)
    setTeam(teamData)
    loadGames(teamData.id)
  }, [router])

  const loadGames = async (teamId: string) => {
    try {
      const response = await fetch(`${API_URL}/teams/${teamId}/games`)
      const data = await response.json()
      setGames(data)
    } catch (err) {
      console.error('Error loading games:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!team) return

    try {
      const response = await fetchWithAuth(
        `${API_URL}/teams/${team.id}/games`,
        team.id,
        {
          method: 'POST',
          body: JSON.stringify({ date }),
        }
      )

      if (response.ok) {
        setDate('')
        setShowForm(false)
        loadGames(team.id)
      } else if (response.status === 401) {
        alert('Please enter edit mode to make changes')
      }
    } catch (err) {
      console.error('Error creating game:', err)
    }
  }

  if (loading || !team) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <EditModeGate teamId={team.id}>
      {(isEditMode, enterEditMode) => (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
              <Link href="/team" className="text-blue-600 hover:text-blue-700">
                ← Back to Team
              </Link>
              {isEditMode ? (
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  {showForm ? 'Cancel' : 'New Game'}
                </button>
              ) : (
                <button
                  onClick={enterEditMode}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  Enter Edit Mode to Create Games
                </button>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h1 className="text-2xl font-bold mb-6">Games</h1>

              {showForm && isEditMode && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Game Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md"
                  required
                />
              </div>
              <button
                type="submit"
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Create Game
              </button>
            </form>
          )}

          <div className="space-y-2">
            {games.length === 0 ? (
              <p className="text-gray-500">No games yet. Create your first game!</p>
            ) : (
              games.map((game) => (
                <Link
                  key={game.id}
                  href={`/team/games/${game.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">
                        {new Date(game.date).toLocaleDateString()}
                      </span>
                      {game.schedule && (
                        <span className="ml-3 text-sm text-green-600">Schedule Generated</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {game.attendance.length} players
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
      )}
    </EditModeGate>
  )
}
