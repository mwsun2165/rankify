'use server'

import { NextRequest, NextResponse } from 'next/server'
import { makeSpotifyRequest, SPOTIFY_API_BASE } from '@/lib/spotify-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { albumId: string } }
) {
  try {
    const { albumId } = params

    // Build URL helper
    const getTracksResponse = async (url: URL, useUserToken = false, userToken?: string) => {
      if (useUserToken && userToken) {
        return fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
          // bypass nextjs cache
          cache: 'no-store',
        })
      }
      // Default: use app-level token via helper
      return makeSpotifyRequest(url.toString())
    }

    // Get album tracks with app token first
    const tracksUrl = new URL(`${SPOTIFY_API_BASE}/albums/${albumId}/tracks`)
    tracksUrl.searchParams.set('limit', '50')

    let response = await getTracksResponse(tracksUrl)

    // Retry with market=US if failed
    if (!response.ok) {
      tracksUrl.searchParams.set('market', 'US')
      response = await getTracksResponse(tracksUrl)
    }

    // If still unauthorized, try with the user's Spotify OAuth token (if logged in)
    if (response.status === 401) {
      const supabase = createServerSupabaseClient()
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Error getting session:', sessionError)
      }

      const userToken = session?.provider_token || session?.access_token

      if (userToken) {
        response = await getTracksResponse(tracksUrl, true, userToken)
      }
    }

    if (!response.ok) {
      const errBody = await response.clone().text()
      console.error('Spotify API failed:', response.status, errBody)
      return NextResponse.json(
        { error: 'Failed to fetch album tracks' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Spotify album tracks error:', error)
    return NextResponse.json({ error: 'Failed to fetch album tracks' }, { status: 500 })
  }
}