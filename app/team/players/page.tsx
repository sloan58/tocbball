'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EditModeGate } from '@/app/components/EditModeGate'
import { fetchWithAuth } from '@/app/lib/api'

export default function PlayersPage() {
  const [team, setTeam] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerJersey, setNewPlayerJersey] = useState('')
  const [newPlayerLevel, setNewPlayerLevel] = useState<number | ''>('')
  const [newPlayerIsPointGuard, setNewPlayerIsPointGuard] = useState(false)
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null)
  const [editPlayerName, setEditPlayerName] = useState('')
  const [editPlayerJersey, setEditPlayerJersey] = useState('')
  const [editPlayerLevel, setEditPlayerLevel] = useState<number | ''>('')
  const [editPlayerIsPointGuard, setEditPlayerIsPointGuard] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const sortPlayersByNumber = (list: any[]) =>
    [...list].sort((a, b) => {
      const numberA = a.jerseyNumber ?? Number.POSITIVE_INFINITY
      const numberB = b.jerseyNumber ?? Number.POSITIVE_INFINITY
      if (numberA !== numberB) return numberA - numberB
      return a.name.localeCompare(b.name)
    })

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
      const response = await fetch(`/api/teams/${teamId}/players`)
      if (!response.ok) throw new Error('Failed to load players')
      const data = await response.json()
      setPlayers(sortPlayersByNumber(data))
    } catch (err) {
      console.error('Error loading players:', err)
      setError('Failed to load players')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPlayer = async (teamId: string) => {
    setError('')
    setSubmitting(true)

    try {
      if (!newPlayerJersey.trim()) {
        throw new Error('Jersey number is required')
      }
      const response = await fetchWithAuth(
        `/api/teams/${teamId}/players`,
        teamId,
        {
          method: 'POST',
          body: JSON.stringify({
            name: newPlayerName,
            jerseyNumber: newPlayerJersey,
            level: newPlayerLevel || null,
            isPointGuard: newPlayerIsPointGuard,
          }),
        }
      )

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to add player')
      }

      const newPlayer = await response.json()
      setPlayers(sortPlayersByNumber([...players, newPlayer]))
      setNewPlayerName('')
      setNewPlayerJersey('')
      setNewPlayerLevel('')
      setNewPlayerIsPointGuard(false)
      setShowAddForm(false)
    } catch (err: any) {
      setError(err.message || 'Failed to add player')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditPlayer = (player: any) => {
    setEditingPlayerId(player.id)
    setEditPlayerName(player.name)
    setEditPlayerJersey(player.jerseyNumber?.toString() || '')
    setEditPlayerLevel(player.level || '')
    setEditPlayerIsPointGuard(player.isPointGuard || false)
    setError('')
  }

  const handleUpdatePlayer = async (teamId: string, playerId: string) => {
    setError('')
    setSubmitting(true)

    try {
      if (!editPlayerJersey.trim()) {
        throw new Error('Jersey number is required')
      }
      const response = await fetchWithAuth(
        `/api/teams/${teamId}/players/${playerId}`,
        teamId,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: editPlayerName,
            jerseyNumber: editPlayerJersey,
            level: editPlayerLevel || null,
            isPointGuard: editPlayerIsPointGuard,
          }),
        }
      )

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to update player')
      }

      const updatedPlayer = await response.json()
      setPlayers(
        sortPlayersByNumber(players.map((p) => (p.id === playerId ? updatedPlayer : p)))
      )
      setEditingPlayerId(null)
      setEditPlayerName('')
      setEditPlayerJersey('')
      setEditPlayerLevel('')
      setEditPlayerIsPointGuard(false)
    } catch (err: any) {
      setError(err.message || 'Failed to update player')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePlayer = async (teamId: string, playerId: string) => {
    if (!confirm('Are you sure you want to remove this player?')) return

    try {
      const response = await fetchWithAuth(
        `/api/teams/${teamId}/players/${playerId}`,
        teamId,
        { method: 'DELETE' }
      )

      if (!response.ok) throw new Error('Failed to delete player')

      setPlayers(players.filter((p) => p.id !== playerId))
    } catch (err) {
      console.error('Error deleting player:', err)
      alert('Failed to delete player')
    }
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
              <Link href="/team" className="text-blue-600 hover:text-blue-800 font-medium text-sm mb-2 inline-block">
                ← Back to Team
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Players</h1>
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
                    You're in view-only mode. Enter admin PIN to add or remove players.
                  </p>
                  <button
                    onClick={enterEditMode}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-semibold transition-colors"
                  >
                    Enter Edit Mode
                  </button>
                </div>
              )}

              {isEditMode && (
                <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <p className="text-gray-700 font-medium">✓ Edit mode enabled</p>
                    <button
                      onClick={() => {
                        localStorage.removeItem(`adminPin_${team.id}`)
                        window.location.reload()
                      }}
                      className="text-red-600 hover:text-red-800 font-medium text-sm"
                    >
                      Exit Edit Mode
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              )}

              {isEditMode && !showAddForm && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 font-semibold transition-colors"
                  >
                    + Add Player
                  </button>
                </div>
              )}

              {isEditMode && showAddForm && (
                <div className="mb-6 bg-white border-2 border-gray-200 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Player</h2>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                        Player Name *
                      </label>
                      <input
                        id="name"
                        type="text"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="jersey" className="block text-sm font-semibold text-gray-900 mb-2">
                        Jersey Number *
                      </label>
                      <input
                        id="jersey"
                        type="number"
                        value={newPlayerJersey}
                        onChange={(e) => setNewPlayerJersey(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                        placeholder="23"
                        min="1"
                        max="99"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="level" className="block text-sm font-semibold text-gray-900 mb-2">
                        Level (1-5, optional)
                      </label>
                      <select
                        id="level"
                        value={newPlayerLevel}
                        onChange={(e) => setNewPlayerLevel(e.target.value ? parseInt(e.target.value) : '')}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                      >
                        <option value="">No level</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                      </select>
                      <p className="text-xs text-gray-600 mt-1">Higher level = preference for extra periods</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="new-is-pg"
                        type="checkbox"
                        checked={newPlayerIsPointGuard}
                        onChange={(e) => setNewPlayerIsPointGuard(e.target.checked)}
                        className="w-5 h-5 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="new-is-pg" className="text-sm font-semibold text-gray-900">
                        Point Guard (ensures at least one PG on floor)
                      </label>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAddPlayer(team.id)}
                        disabled={submitting || !newPlayerName.trim()}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-semibold transition-colors"
                      >
                        {submitting ? 'Adding...' : 'Add Player'}
                      </button>
                        <button
                        onClick={() => {
                          setShowAddForm(false)
                          setNewPlayerName('')
                          setNewPlayerJersey('')
                          setNewPlayerLevel('')
                          setNewPlayerIsPointGuard(false)
                          setError('')
                        }}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Active Players ({players.length})
                  </h2>
                </div>
                {players.length === 0 ? (
                  <div className="p-8 text-center text-gray-600">
                    <p className="font-medium">No players yet.</p>
                    {isEditMode && (
                      <p className="text-sm mt-2">Click "Add Player" to get started.</p>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {players.map((player) => (
                      <div key={player.id}>
                        {editingPlayerId === player.id ? (
                          <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Player</h3>
                            <div className="space-y-4">
                              <div>
                                <label htmlFor={`edit-name-${player.id}`} className="block text-sm font-semibold text-gray-900 mb-2">
                                  Player Name *
                                </label>
                                <input
                                  id={`edit-name-${player.id}`}
                                  type="text"
                                  value={editPlayerName}
                                  onChange={(e) => setEditPlayerName(e.target.value)}
                                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                                  placeholder="John Doe"
                                  required
                                />
                              </div>
                              <div>
                      <label htmlFor={`edit-jersey-${player.id}`} className="block text-sm font-semibold text-gray-900 mb-2">
                        Jersey Number *
                                </label>
                                <input
                                  id={`edit-jersey-${player.id}`}
                                  type="number"
                                  value={editPlayerJersey}
                                  onChange={(e) => setEditPlayerJersey(e.target.value)}
                                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                                  placeholder="23"
                                  min="1"
                                  max="99"
                        required
                                />
                              </div>
                              <div>
                                <label htmlFor={`edit-level-${player.id}`} className="block text-sm font-semibold text-gray-900 mb-2">
                                  Level (1-5, optional)
                                </label>
                                <select
                                  id={`edit-level-${player.id}`}
                                  value={editPlayerLevel}
                                  onChange={(e) => setEditPlayerLevel(e.target.value ? parseInt(e.target.value) : '')}
                                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                                >
                                  <option value="">No level</option>
                                  <option value="1">1</option>
                                  <option value="2">2</option>
                                  <option value="3">3</option>
                                  <option value="4">4</option>
                                  <option value="5">5</option>
                                </select>
                                <p className="text-xs text-gray-600 mt-1">Higher level = preference for extra periods</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  id={`edit-is-pg-${player.id}`}
                                  type="checkbox"
                                  checked={editPlayerIsPointGuard}
                                  onChange={(e) => setEditPlayerIsPointGuard(e.target.checked)}
                                  className="w-5 h-5 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor={`edit-is-pg-${player.id}`} className="text-sm font-semibold text-gray-900">
                                  Point Guard (ensures at least one PG on floor)
                                </label>
                              </div>
                              <div className="flex gap-3">
                                <button
                                  onClick={() => handleUpdatePlayer(team.id, player.id)}
                                  disabled={submitting || !editPlayerName.trim()}
                                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-semibold transition-colors"
                                >
                                  {submitting ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingPlayerId(null)
                                    setEditPlayerName('')
                                    setEditPlayerJersey('')
                                    setEditPlayerLevel('')
                                    setEditPlayerIsPointGuard(false)
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
                          <div className="p-6 flex justify-between items-center hover:bg-gray-50 transition-colors">
                            <div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-lg font-semibold text-gray-900">
                                  {player.name}
                                </span>
                                {player.level && (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-semibold" title="Level">
                                    Level {player.level}
                                  </span>
                                )}
                                {player.isPointGuard && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-semibold" title="Point Guard">
                                    PG
                                  </span>
                                )}
                                {player.jerseyNumber && (
                                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-bold">
                                    #{player.jerseyNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isEditMode && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditPlayer(player)}
                                  className="text-blue-600 hover:text-blue-800 font-medium text-sm px-4 py-2 rounded-md hover:bg-blue-50 transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeletePlayer(team.id, player.id)}
                                  className="text-red-600 hover:text-red-800 font-medium text-sm px-4 py-2 rounded-md hover:bg-red-50 transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </EditModeGate>
      </div>
    </div>
  )
}
