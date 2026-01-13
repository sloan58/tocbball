'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setAdminPin } from '../lib/api'

export default function CreateTeam() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdTeam, setCreatedTeam] = useState<any>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        throw new Error('Failed to create team')
      }

      const team = await response.json()
      setCreatedTeam(team)
      setAdminPin(team.id, team.adminPin)
      const { adminPin, ...teamWithoutPin } = team
      localStorage.setItem('team', JSON.stringify(teamWithoutPin))
    } catch (err) {
      setError('Failed to create team. Please try again.')
      setLoading(false)
    }
  }

  const handleContinue = () => {
    router.push('/team')
  }

  if (createdTeam) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">
            Team Created!
          </h1>

          <div className="space-y-4 mb-6">
            <div className="p-5 bg-blue-50 border-2 border-blue-300 rounded-lg">
              <p className="text-sm font-semibold text-gray-900 mb-3">Team Code (for viewing):</p>
              <p className="text-3xl font-mono font-bold text-center text-blue-700 tracking-wider">{createdTeam.code}</p>
            </div>

            <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-lg">
              <p className="text-sm font-semibold text-gray-900 mb-3">Admin PIN (for editing):</p>
              <p className="text-4xl font-mono font-bold text-center text-amber-700 tracking-wider">{createdTeam.adminPin}</p>
              <p className="text-sm text-gray-700 text-center mt-3 font-medium">
                ⚠️ Save this PIN! You'll need it to make changes.
              </p>
            </div>
          </div>

          <button
            onClick={handleContinue}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-semibold transition-colors"
          >
            Continue to Team
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">
          Create New Team
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
              Team Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
              placeholder="Thunder"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-red-700 text-sm font-medium bg-red-50 p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 font-semibold transition-colors"
          >
            {loading ? 'Creating...' : 'Create Team'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => router.back()}
            className="text-gray-700 hover:text-gray-900 font-medium text-sm transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  )
}
