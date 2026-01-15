'use client'

import { useState, useEffect } from 'react'

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
    const storedPin = localStorage.getItem(`adminPin_${teamId}`)
    if (storedPin) {
      setIsEditMode(true)
    }
  }, [teamId])

  const handleVerifyPin = async () => {
    setError('')
    setVerifying(true)

    try {
      const response = await fetch(`/api/teams/${teamId}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      if (!response.ok) {
        throw new Error('Invalid PIN')
      }

      localStorage.setItem(`adminPin_${teamId}`, pin)
      setIsEditMode(true)
      setShowPinPrompt(false)
      setPin('')
      window.dispatchEvent(new Event('admin-pin-updated'))
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
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full border border-gray-200">
          <h2 className="text-2xl font-bold mb-3 text-gray-900">Enter Admin PIN</h2>
          <p className="text-gray-700 text-sm mb-6 font-medium">
            Enter the admin PIN to make changes to this team.
          </p>
          <div>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="0000"
              maxLength={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl font-mono tracking-widest text-gray-900 font-bold"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleVerifyPin()
                }
              }}
            />
            {error && <p className="text-red-700 text-sm mt-3 font-medium bg-red-50 p-2 rounded border border-red-200">{error}</p>}
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                setShowPinPrompt(false)
                setPin('')
                setError('')
              }}
              className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleVerifyPin}
              disabled={verifying || pin.length !== 4}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-semibold transition-colors"
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
