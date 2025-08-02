'use client'

import { createClientSupabaseClient } from '@/lib/supabase-client'
import { AuthButton } from './auth-button'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export function UserNav() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientSupabaseClient()
  const { handleLogout, loading: logoutLoading } = AuthButton()

  useEffect(() => {
    // Get initial user (secure method)
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      {user.user_metadata?.avatar_url && (
        <img
          src={user.user_metadata.avatar_url}
          alt="Avatar"
          className="w-8 h-8 rounded-full"
        />
      )}
      <span className="text-sm font-medium">
        {user.user_metadata?.full_name?.split(' ')[0] || 'User'}
      </span>
      <button
        onClick={handleLogout}
        disabled={logoutLoading}
        className="text-sm text-gray-500 hover:text-gray-700 disabled:text-gray-400"
      >
        {logoutLoading ? '...' : 'Sign out'}
      </button>
    </div>
  )
}