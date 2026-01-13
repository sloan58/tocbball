'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Team, Player } from '@tocbball/shared'
import { EditModeGate } from '../../components/EditModeGate'
import { fetchWithAuth } from '../../lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export default function PlayersPage() {
  const [team, setTeam] = useState<Team | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [jerseyNumber, setJerseyNumber] = useState('')
  const router = useRouter()

  useEffect(() => {
    const storedTeam = localStorage.getItem('team')
    if (!storedTeam) {
      router.push('/')
      return
    }

    const teamData = JSON.parse(storedTeam)
    setTeam(teamData)
    loadPlayers(teamData.id)
  }, [router])

  const loadPlayers = async (teamId: string) => {
    try {
      const response = await fetch(`${API_URL}/teams/${teamId}/players`)
      const data = await response.json()
      setPlayers(data.filter((p: Player) => p.active))
    } catch (err) {
      console.error('Error loading players:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!team) return

    try {
      const response = await fetchWithAuth(
        `${API_URL}/teams/${team.id}/players`,
        team.id,
        {
          method: 'POST',
          body: JSON.stringify({
            name,
            jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : undefined,
          }),
        }
      )

      if (response.ok) {
        setName('')
        setJerseyNumber('')
        setShowForm(false)
        loadPlayers(team.id)
      } else if (response.status === 401) {
        alert('Please enter edit mode to make changes')
      }
    } catch (err) {
      console.error('Error creating player:', err)
    }
  }

  const handleDelete = async (playerId: string) => {
    if (!team || !confirm('Delete this player?')) return

    try {
      const response = await fetchWithAuth(
        `${API_URL}/teams/${team.id}/players/${playerId}`,
        team.id,
        {
          method: 'DELETE',
        }
      )

      if (response.ok) {
        loadPlayers(team.id)
      } else if (response.status === 401) {
        alert('Please enter edit mode to make changes')
      }
    } catch (err) {
      console.error('Error deleting player:', err)
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
                  {showForm ? 'Cancel' : 'Add Player'}
                </button>
              ) : (
                <button
                  onClick={enterEditMode}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  Enter Edit Mode to Add Players
                </button>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h1 className="text-2xl font-bold mb-6">Players</h1>

              {showForm && isEditMode && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jersey Number
                  </label>
                  <input
                    type="number"
                    value={jerseyNumber}
                    onChange={(e) => setJerseyNumber(e.target.value)}
                    className="w-full px-4 py-2 border rounded-md"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Add Player
              </button>
            </form>
          )}

          <div className="space-y-2">
            {players.length === 0 ? (
              <p className="text-gray-500">No players yet. Add your first player!</p>
            ) : (
              players.map((player) => (
                <div
                  key={player.id}
                  className="flex justify-between items-center p-4 border rounded-lg"
                >
                  <div>
                    <span className="font-medium">
                      {player.jerseyNumber && `#${player.jerseyNumber} `}
                      {player.name}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(player.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
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
