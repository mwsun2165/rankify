import { NextRequest, NextResponse } from 'next/server'
import { makeSpotifyRequest, SPOTIFY_API_BASE } from '@/lib/spotify-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type') || 'album'
    const limit = searchParams.get('limit') || '10'

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    // Search Spotify
    const searchUrl = new URL(`${SPOTIFY_API_BASE}/search`)
    searchUrl.searchParams.set('q', query)
    searchUrl.searchParams.set('type', type)
    searchUrl.searchParams.set('limit', limit)
    searchUrl.searchParams.set('market', 'US')

    const spotifyResponse = await makeSpotifyRequest(searchUrl.toString())

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