'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export default function Home() {
  const [teamCode, setTeamCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if team is already stored
    const storedTeam = localStorage.getItem('team')
    if (storedTeam) {
      router.push('/team')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/teams/${teamCode.toUpperCase()}`)
      if (!response.ok) {
        setError('Team not found. Please check your team code.')
        setLoading(false)
        return
      }

      const team = await response.json()
      localStorage.setItem('team', JSON.stringify(team))
      router.push('/team')
    } catch (err) {
      setError('Failed to load team. Please try again.')
      setLoading(false)
    }
  }

  const handleCreateTeam = () => {
    router.push('/create-team')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">
          Basketball Playing Time Scheduler
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="teamCode" className="block text-sm font-medium text-gray-700 mb-2">
              Enter Team Code
            </label>
            <input
              id="teamCode"
              type="text"
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              placeholder="ABC123"
              maxLength={6}
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
            {loading ? 'Loading...' : 'Access Team'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={handleCreateTeam}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            Create New Team
          </button>
        </div>
      </div>
    </div>
  )
}
