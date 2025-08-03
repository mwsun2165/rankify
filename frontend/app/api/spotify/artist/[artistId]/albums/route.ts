import { NextRequest, NextResponse } from 'next/server'
import { makeSpotifyRequest, SPOTIFY_API_BASE } from '@/lib/spotify-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { artistId: string } }
) {
  try {
    const { artistId } = params

    // Get artist albums
    const albumsUrl = new URL(`${SPOTIFY_API_BASE}/artists/${artistId}/albums`)
    albumsUrl.searchParams.set('include_groups', 'album,single')
    albumsUrl.searchParams.set('market', 'US')
    albumsUrl.searchParams.set('limit', '50')

    const spotifyResponse = await makeSpotifyRequest(albumsUrl.toString())

    if (!spotifyResponse.ok) {
      throw new Error('Spotify API request failed')
    }

    const data = await spotifyResponse.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Spotify artist albums error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch artist albums' },
      { status: 500 }
    )
  }
}
