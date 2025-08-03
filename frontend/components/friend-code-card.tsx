'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'

interface FriendCodeCardProps {
  friendCode: string
  hideHeader?: boolean
}

export function FriendCodeCard({ friendCode, hideHeader = false }: FriendCodeCardProps) {
  const [addFriendCode, setAddFriendCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const copyFriendCode = async () => {
    try {
      await navigator.clipboard.writeText(friendCode)
      toast.success('Friend code copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy friend code')
    }
  }

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addFriendCode.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/friends/send-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: addFriendCode.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message)
        setAddFriendCode('')
      } else {
        toast.error(data.error || 'Failed to send friend request')
      }
    } catch (error) {
      toast.error('Failed to send friend request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {!hideHeader && (
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Friend System</h2>
      )}
      
      {/* Your Friend Code */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Your Friend Code</h3>
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={friendCode}
                readOnly
                className="w-full px-4 py-3 text-lg font-mono bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={copyFriendCode}
            className="px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          >
            Copy
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Share this code with friends so they can add you!
        </p>
      </div>

      {/* Add Friend */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Add a Friend</h3>
        <form onSubmit={handleAddFriend} className="flex space-x-3">
          <div className="flex-1">
            <input
              type="text"
              value={addFriendCode}
              onChange={(e) => setAddFriendCode(e.target.value.toUpperCase())}
              placeholder="Enter friend code"
              maxLength={8}
              className="w-full px-4 py-3 text-lg font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={!addFriendCode.trim() || isSubmitting}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Sending...' : 'Add Friend'}
          </button>
        </form>
        <p className="text-sm text-gray-600 mt-2">
          Enter a friend's 8-character code to send them a friend request.
        </p>
      </div>
    </div>
  )
}