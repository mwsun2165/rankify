import { NextRequest, NextResponse } from 'next/server'

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'

async function getSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured')
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: 'grant_type=client_credentials'
  })

  if (!response.ok) {
    throw new Error('Failed to get Spotify access token')
  }

  const data = await response.json()
  return data.access_token
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type') || 'album'
    const limit = searchParams.get('limit') || '10'

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    // Get access token
    const accessToken = await getSpotifyAccessToken()

    // Search Spotify
    const searchUrl = new URL(`${SPOTIFY_API_BASE}/search`)
    searchUrl.searchParams.set('q', query)
    searchUrl.searchParams.set('type', type)
    searchUrl.searchParams.set('limit', limit)
    searchUrl.searchParams.set('market', 'US')

    const spotifyResponse = await fetch(searchUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!spotifyResponse.ok) {
      throw new Error('Spotify API request failed')
    }

    const data = await spotifyResponse.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Spotify search error:', error)
    return NextResponse.json(
      { error: 'Failed to search Spotify' }, 
      { status: 500 }
    )
  }
}