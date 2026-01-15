'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EditModeGate } from '@/app/components/EditModeGate'
import { fetchWithAuth } from '@/app/lib/api'

export default function GamesPage() {
  const [team, setTeam] = useState<any>(null)
  const [games, setGames] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newGameDate, setNewGameDate] = useState('')
  const [newGameLocation, setNewGameLocation] = useState('')
  const [newGameOpponent, setNewGameOpponent] = useState('')
  const [newGameVenue, setNewGameVenue] = useState<'home' | 'away'>('home')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
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
      const response = await fetch(`/api/teams/${teamId}/games`)
      if (!response.ok) throw new Error('Failed to load games')
      const data = await response.json()
      setGames(data)
    } catch (err) {
      console.error('Error loading games:', err)
      setError('Failed to load games')
    } finally {
      setLoading(false)
    }
  }

  const handleAddGame = async (teamId: string) => {
    setError('')
    setSubmitting(true)

    try {
      const response = await fetchWithAuth(
        `/api/teams/${teamId}/games`,
        teamId,
        {
          method: 'POST',
          body: JSON.stringify({
            date: newGameDate,
            location: newGameLocation,
            opponent: newGameOpponent,
            venue: newGameVenue,
          }),
        }
      )

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to create game')
      }

      const newGame = await response.json()
      setGames([newGame, ...games])
      setNewGameDate('')
      setNewGameLocation('')
      setNewGameOpponent('')
      setNewGameVenue('home')
      setShowAddForm(false)
      router.push(`/team/games/${newGame.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create game')
    } finally {
      setSubmitting(false)
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
              <h1 className="text-3xl font-bold text-gray-900">Games</h1>
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
                    You're in view-only mode. Enter admin PIN to create games.
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
                    + Create Game
                  </button>
                </div>
              )}

              {isEditMode && showAddForm && (
                <div className="mb-6 bg-white border-2 border-gray-200 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Game</h2>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="date" className="block text-sm font-semibold text-gray-900 mb-2">
                        Game Date & Time *
                      </label>
                      <input
                        id="date"
                        type="datetime-local"
                        value={newGameDate}
                        onChange={(e) => setNewGameDate(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="opponent" className="block text-sm font-semibold text-gray-900 mb-2">
                        Opponent *
                      </label>
                      <input
                        id="opponent"
                        type="text"
                        value={newGameOpponent}
                        onChange={(e) => setNewGameOpponent(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                        placeholder="Team Name"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="location" className="block text-sm font-semibold text-gray-900 mb-2">
                        Location *
                      </label>
                      <input
                        id="location"
                        type="text"
                        value={newGameLocation}
                        onChange={(e) => setNewGameLocation(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                        placeholder="Main Gym"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="venue" className="block text-sm font-semibold text-gray-900 mb-2">
                        Venue *
                      </label>
                      <select
                        id="venue"
                        value={newGameVenue}
                        onChange={(e) => setNewGameVenue(e.target.value as 'home' | 'away')}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                        required
                      >
                        <option value="home">Home</option>
                        <option value="away">Away</option>
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAddGame(team.id)}
                        disabled={submitting || !newGameDate || !newGameLocation.trim() || !newGameOpponent.trim()}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-semibold transition-colors"
                      >
                        {submitting ? 'Creating...' : 'Create Game'}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddForm(false)
                          setNewGameDate('')
                          setNewGameLocation('')
                          setNewGameOpponent('')
                          setNewGameVenue('home')
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
                    Games ({games.length})
                  </h2>
                </div>
                {games.length === 0 ? (
                  <div className="p-8 text-center text-gray-600">
                    <p className="font-medium">No games yet.</p>
                    {isEditMode && (
                      <p className="text-sm mt-2">Click "Create Game" to get started.</p>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {games.map((game) => {
                      const attendance = JSON.parse(game.attendance || '[]')
                      const hasSchedule = !!game.schedule
                      return (
                        <Link
                          key={game.id}
                          href={`/team/games/${game.id}`}
                          className="block p-6 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-lg font-semibold text-gray-900">
                                {new Date(game.date).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {new Date(game.date).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                                <span className="ml-2">• {game.location}</span>
                                <span className="ml-2 text-gray-700">
                                  • {game.venue === 'away' ? 'Away' : 'Home'}
                                </span>
                                <span className="ml-2">• vs {game.opponent}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">
                                  {attendance.length} players
                                </div>
                                {hasSchedule && (
                                  <div className="text-xs text-green-600 font-medium mt-1">
                                    ✓ Schedule ready
                                  </div>
                                )}
                              </div>
                              <div className="text-gray-400">
                                →
                              </div>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
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
