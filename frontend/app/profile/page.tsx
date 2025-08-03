'use client'

import { useEffect, useState } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { FriendSystemCard } from '@/components/friend-system'
import type { User } from '@supabase/supabase-js'

interface ProfileStats {
  friendCount: number
  totalLikes: number
}

interface UserProfile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  friend_code: string
  created_at: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<ProfileStats>({ friendCount: 0, totalLikes: 0 })
  const [loading, setLoading] = useState(true)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          setLoading(false)
          return
        }
        setUser(user)

        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          setLoading(false)
          return
        }

        setProfile(profileData)

        // Get friend count using the database function
        const { data: friendCountData, error: friendCountError } = await supabase
          .rpc('get_friend_count', { user_uuid: user.id })

        // Get total likes on public rankings
        const { data: likesData, error: likesError } = await supabase
          .rpc('get_user_ranking_likes', { user_uuid: user.id })

        if (!friendCountError && !likesError) {
          setStats({
            friendCount: friendCountData || 0,
            totalLikes: likesData || 0
          })
        }

      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Found</h1>
          <p className="text-gray-600">Please sign in to view your profile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-6">
            {profile.avatar_url && (
              <img
                src={profile.avatar_url}
                alt="Profile"
                className="w-24 h-24 rounded-full"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {profile.display_name || profile.username || 'Anonymous User'}
              </h1>
              {profile.username && profile.display_name && (
                <p className="text-gray-600">@{profile.username}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Member since {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Friends</p>
                <p className="text-2xl font-bold text-gray-900">{stats.friendCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Likes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalLikes}</p>
                <p className="text-xs text-gray-500">on your public rankings</p>
              </div>
            </div>
          </div>
        </div>

        {/* Friend Code Card */}
        <FriendSystemCard friendCode={profile.friend_code} userId={profile.id} />
      </div>
    </div>
  )
}