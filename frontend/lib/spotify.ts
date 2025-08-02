import type { SpotifySearchResult } from '@/types/spotify'

export async function searchSpotify(
  query: string,
  type: 'album' | 'artist',
  signal?: AbortSignal
): Promise<SpotifySearchResult> {
  try {
    const searchParams = new URLSearchParams({
      q: query,
      type: type,
      limit: '10'
    })

    const response = await fetch(`/api/spotify/search?${searchParams}`, {
      signal
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Search failed')
    }

    const data = await response.json()
    
    // Transform the Spotify API response to match our expected format
    return {
      albums: data.albums || { items: [] },
      artists: data.artists || { items: [] }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      const abortError = new Error('Request aborted')
      abortError.name = 'AbortError'
      throw abortError
    }
    throw error
  }
}