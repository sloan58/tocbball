'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Team, Coach } from '@tocbball/shared'
import { EditModeGate } from '../../components/EditModeGate'
import { fetchWithAuth } from '../../lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export default function CoachesPage() {
  const [team, setTeam] = useState<Team | null>(null)
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const router = useRouter()

  useEffect(() => {
    const storedTeam = localStorage.getItem('team')
    if (!storedTeam) {
      router.push('/')
      return
    }

    const teamData = JSON.parse(storedTeam)
    setTeam(teamData)
    loadCoaches(teamData.id)
  }, [router])

  const loadCoaches = async (teamId: string) => {
    try {
      const response = await fetch(`${API_URL}/teams/${teamId}/coaches`)
      const data = await response.json()
      setCoaches(data)
    } catch (err) {
      console.error('Error loading coaches:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!team) return

    try {
      const response = await fetchWithAuth(
        `${API_URL}/teams/${team.id}/coaches`,
        team.id,
        {
          method: 'POST',
          body: JSON.stringify({ name, email: email || undefined }),
        }
      )

      if (response.ok) {
        setName('')
        setEmail('')
        setShowForm(false)
        loadCoaches(team.id)
      } else if (response.status === 401) {
        alert('Please enter edit mode to make changes')
      }
    } catch (err) {
      console.error('Error creating coach:', err)
    }
  }

  const handleDelete = async (coachId: string) => {
    if (!team || !confirm('Delete this coach?')) return

    try {
      const response = await fetchWithAuth(
        `${API_URL}/teams/${team.id}/coaches/${coachId}`,
        team.id,
        {
          method: 'DELETE',
        }
      )

      if (response.ok) {
        loadCoaches(team.id)
      } else if (response.status === 401) {
        alert('Please enter edit mode to make changes')
      }
    } catch (err) {
      console.error('Error deleting coach:', err)
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
                  {showForm ? 'Cancel' : 'Add Coach'}
                </button>
              ) : (
                <button
                  onClick={enterEditMode}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  Enter Edit Mode to Add Coaches
                </button>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h1 className="text-2xl font-bold mb-6">Coaches</h1>

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
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border rounded-md"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Add Coach
              </button>
            </form>
          )}

          <div className="space-y-2">
            {coaches.length === 0 ? (
              <p className="text-gray-500">No coaches yet. Add your first coach!</p>
            ) : (
              coaches.map((coach) => (
                <div
                  key={coach.id}
                  className="flex justify-between items-center p-4 border rounded-lg"
                >
                  <div>
                    <span className="font-medium">{coach.name}</span>
                    {coach.email && (
                      <span className="ml-2 text-sm text-gray-500">{coach.email}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(coach.id)}
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
