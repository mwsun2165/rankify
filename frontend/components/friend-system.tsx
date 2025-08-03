'use client'

import { FriendCodeCard } from '@/components/friend-code-card'
import { useEffect, useState } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase-client'

interface FriendSystemCardProps {
  friendCode: string
  userId: string
}

interface FriendProfile {
  id: string
  display_name: string | null
  username: string | null
  avatar_url: string | null
}

export function FriendSystemCard({ friendCode, userId }: FriendSystemCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Friend System</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Friend Code + Add Friend */}
        <FriendCodeCard friendCode={friendCode} hideHeader />
        {/* Friends list */}
        <FriendsList userId={userId} />
      </div>
    </div>
  )
}

function FriendsList({ userId }: { userId: string }) {
  const supabase = createClientSupabaseClient()
  const [friends, setFriends] = useState<FriendProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)

  const pageSize = 5

  useEffect(() => {
    const loadFriends = async () => {
      try {
        setLoading(true)

        // 1. Get IDs the user is following
        const { data: followingData, error: followingError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId)

        if (followingError) {
          console.error('Error fetching following list', followingError)
          return
        }

        const followingIds = (followingData || []).map((f: any) => f.following_id)
        if (followingIds.length === 0) {
          setFriends([])
          return
        }

        // 2. Filter those where they follow back
        const { data: mutualData, error: mutualError } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', userId)
          .in('follower_id', followingIds)

        if (mutualError) {
          console.error('Error fetching mutual follows', mutualError)
          return
        }

        const friendIds = (mutualData || []).map((m: any) => m.follower_id)
        if (friendIds.length === 0) {
          setFriends([])
          return
        }

        // 3. Fetch friend profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url')
          .in('id', friendIds)

        if (profilesError) {
          console.error('Error fetching friend profiles', profilesError)
          return
        }

        setFriends(profiles || [])
      } catch (err) {
        console.error('Unexpected error loading friends', err)
      } finally {
        setLoading(false)
      }
    }

    loadFriends()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const totalPages = Math.ceil(friends.length / pageSize)
  const paginatedFriends = friends.slice(currentPage * pageSize, currentPage * pageSize + pageSize)

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-3">Your Friends</h3>
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : friends.length === 0 ? (
        <p className="text-sm text-gray-600">You have no friends yet.</p>
      ) : (
        <>
          {/* Tabs/Pagination */}
          {totalPages > 1 && (
            <div className="flex space-x-2 mb-4">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx)}
                  className={`px-3 py-1 text-sm rounded-full ${currentPage === idx ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'} focus:outline-none`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          )}

          {/* Friends List */}
          <ul className="space-y-4">
            {paginatedFriends.map((friend) => (
              <li key={friend.id} className="flex items-center">
                {friend.avatar_url ? (
                  <img src={friend.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-bold uppercase">
                    {(friend.display_name || friend.username || '?').slice(0, 1)}
                  </div>
                )}
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {friend.display_name || friend.username || 'Unknown'}
                  </p>
                  {friend.username && friend.display_name && (
                    <p className="text-xs text-gray-500">@{friend.username}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
