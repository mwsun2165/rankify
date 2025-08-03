'use client'

import { createClientSupabaseClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function AuthButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  const handleSpotifyLogin = async () => {
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'spotify',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'user-read-email user-read-private',
        },
      })

      if (error) {
        console.error('Error logging in:', error)
      }
    } catch (error) {
      console.error('Error logging in:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setLoading(true)

    try {
      // Clear client-side session (localStorage & memory)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error logging out:', error)
      }

      // Also clear the HTTP-only cookies on the server so that
      // subsequent requests made from the browser are unauthenticated.
      await fetch('/auth/signout', { method: 'POST' })

      // Redirect the user to the login page and force a revalidation of server components
      router.replace('/')
      router.refresh()
    } catch (error) {
      console.error('Error logging out:', error)
    } finally {
      setLoading(false)
    }
  }

  return {
    handleSpotifyLogin,
    handleLogout,
    loading,
  }
}
