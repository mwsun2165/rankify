import { NextRequest, NextResponse } from 'next/server'
import { makeSpotifyRequest, SPOTIFY_API_BASE } from '@/lib/spotify-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { artistId: string } }
) {
  try {
    const { artistId } = params

    // Get artist top tracks
    const tracksUrl = new URL(`${SPOTIFY_API_BASE}/artists/${artistId}/top-tracks`)
    tracksUrl.searchParams.set('market', 'US')

    const spotifyResponse = await makeSpotifyRequest(tracksUrl.toString())

    if (!spotifyResponse.ok) {
      throw new Error('Spotify API request failed')
    }

    const data = await spotifyResponse.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Spotify artist top tracks error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch artist top tracks' }, 
      { status: 500 }
    )
  }
}