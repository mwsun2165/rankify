import type { SpotifyAlbum, SpotifyTrack } from '@/types/spotify'

// Get all albums for an artist
export async function getArtistAlbums(artistId: string): Promise<SpotifyAlbum[]> {
  try {
    const response = await fetch(`/api/spotify/artist/${artistId}/albums`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch artist albums')
    }

    const data = await response.json()
    return data.items || []
  } catch (error) {
    console.error('Error fetching artist albums:', error)
    throw error
  }
}

// Get all tracks for an album
export async function getAlbumTracks(albumId: string): Promise<SpotifyTrack[]> {
  try {
    const response = await fetch(`/api/spotify/album/${albumId}/tracks`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch album tracks')
    }

    const data = await response.json()
    return data.items || []
  } catch (error) {
    console.error('Error fetching album tracks:', error)
    throw error
  }
}

// Get top tracks for an artist
export async function getArtistTopTracks(artistId: string): Promise<SpotifyTrack[]> {
  try {
    const response = await fetch(`/api/spotify/artist/${artistId}/top-tracks`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch artist top tracks')
    }

    const data = await response.json()
    return data.tracks || []
  } catch (error) {
    console.error('Error fetching artist top tracks:', error)
    throw error
  }
}