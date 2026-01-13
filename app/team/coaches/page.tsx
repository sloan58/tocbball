'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EditModeGate } from '@/app/components/EditModeGate'
import { fetchWithAuth } from '@/app/lib/api'

export default function CoachesPage() {
  const [team, setTeam] = useState<any>(null)
  const [coaches, setCoaches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCoachName, setNewCoachName] = useState('')
  const [newCoachEmail, setNewCoachEmail] = useState('')
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
    loadCoaches(teamData.id)
  }, [router])

  const loadCoaches = async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/coaches`)
      if (!response.ok) throw new Error('Failed to load coaches')
      const data = await response.json()
      setCoaches(data)
    } catch (err) {
      console.error('Error loading coaches:', err)
      setError('Failed to load coaches')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCoach = async (teamId: string) => {
    setError('')
    setSubmitting(true)

    try {
      const response = await fetchWithAuth(
        `/api/teams/${teamId}/coaches`,
        teamId,
        {
          method: 'POST',
          body: JSON.stringify({
            name: newCoachName,
            email: newCoachEmail || null,
          }),
        }
      )

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to add coach')
      }

      const newCoach = await response.json()
      setCoaches([...coaches, newCoach].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCoachName('')
      setNewCoachEmail('')
      setShowAddForm(false)
    } catch (err: any) {
      setError(err.message || 'Failed to add coach')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCoach = async (teamId: string, coachId: string) => {
    if (!confirm('Are you sure you want to remove this coach?')) return

    try {
      const response = await fetchWithAuth(
        `/api/teams/${teamId}/coaches/${coachId}`,
        teamId,
        { method: 'DELETE' }
      )

      if (!response.ok) throw new Error('Failed to delete coach')

      setCoaches(coaches.filter((c) => c.id !== coachId))
    } catch (err) {
      console.error('Error deleting coach:', err)
      alert('Failed to delete coach')
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
              <h1 className="text-3xl font-bold text-gray-900">Coaches</h1>
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
                    You're in view-only mode. Enter admin PIN to add or remove coaches.
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
                    + Add Coach
                  </button>
                </div>
              )}

              {isEditMode && showAddForm && (
                <div className="mb-6 bg-white border-2 border-gray-200 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Coach</h2>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                        Coach Name *
                      </label>
                      <input
                        id="name"
                        type="text"
                        value={newCoachName}
                        onChange={(e) => setNewCoachName(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                        placeholder="Jane Smith"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                        Email (optional)
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={newCoachEmail}
                        onChange={(e) => setNewCoachEmail(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                        placeholder="jane@example.com"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAddCoach(team.id)}
                        disabled={submitting || !newCoachName.trim()}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-semibold transition-colors"
                      >
                        {submitting ? 'Adding...' : 'Add Coach'}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddForm(false)
                          setNewCoachName('')
                          setNewCoachEmail('')
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
                    Coaches ({coaches.length})
                  </h2>
                </div>
                {coaches.length === 0 ? (
                  <div className="p-8 text-center text-gray-600">
                    <p className="font-medium">No coaches yet.</p>
                    {isEditMode && (
                      <p className="text-sm mt-2">Click "Add Coach" to get started.</p>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {coaches.map((coach) => (
                      <div
                        key={coach.id}
                        className="p-6 flex justify-between items-center hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <div className="text-lg font-semibold text-gray-900">
                            {coach.name}
                          </div>
                          {coach.email && (
                            <div className="text-sm text-gray-600 mt-1">{coach.email}</div>
                          )}
                        </div>
                        {isEditMode && (
                          <button
                            onClick={() => handleDeleteCoach(team.id, coach.id)}
                            className="text-red-600 hover:text-red-800 font-medium text-sm px-4 py-2 rounded-md hover:bg-red-50 transition-colors"
                          >
                            Remove
                          </button>
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
