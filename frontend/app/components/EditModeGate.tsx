'use client'

import { useState, useEffect } from 'react'
import { getAdminPin, setAdminPin } from '../lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface EditModeGateProps {
  teamId: string
  children: (isEditMode: boolean, enterEditMode: () => void) => React.ReactNode
}

export function EditModeGate({ teamId, children }: EditModeGateProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [showPinPrompt, setShowPinPrompt] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    // Check if PIN is already stored
    const storedPin = getAdminPin(teamId)
    if (storedPin) {
      setIsEditMode(true)
    }
  }, [teamId])

  const handleVerifyPin = async () => {
    setError('')
    setVerifying(true)

    try {
      const response = await fetch(`${API_URL}/teams/${teamId}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      if (!response.ok) {
        throw new Error('Invalid PIN')
      }

      setAdminPin(teamId, pin)
      setIsEditMode(true)
      setShowPinPrompt(false)
      setPin('')
    } catch (err) {
      setError('Invalid PIN. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const enterEditMode = () => {
    setShowPinPrompt(true)
  }

  if (showPinPrompt) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">Enter Admin PIN</h2>
          <p className="text-gray-600 text-sm mb-4">
            Enter the admin PIN to make changes to this team.
          </p>
          <div>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="0000"
              maxLength={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleVerifyPin()
                }
              }}
            />
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                setShowPinPrompt(false)
                setPin('')
                setError('')
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleVerifyPin}
              disabled={verifying || pin.length !== 4}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {verifying ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children(isEditMode, enterEditMode)}</>
}
