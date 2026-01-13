'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setAdminPin } from '../lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

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
      const response = await fetch(`${API_URL}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        throw new Error('Failed to create team')
      }

      const team = await response.json()
      setCreatedTeam(team)
      // Store PIN in localStorage
      setAdminPin(team.id, team.adminPin)
      // Store team (without PIN)
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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-center mb-6">
            Team Created!
          </h1>

          <div className="space-y-4 mb-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Team Code (for viewing):</p>
              <p className="text-2xl font-mono font-bold text-center">{createdTeam.code}</p>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Admin PIN (for editing):</p>
              <p className="text-3xl font-mono font-bold text-center">{createdTeam.adminPin}</p>
              <p className="text-xs text-gray-500 text-center mt-2">
                Save this PIN! You'll need it to make changes.
              </p>
            </div>
          </div>

          <button
            onClick={handleContinue}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Continue to Team
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">
          Create New Team
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Team Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Thunder"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Team'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-700 text-sm"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  )
}
