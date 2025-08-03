export interface SpotifyImage {
  url: string
  height: number
  width: number
}

export interface SpotifyArtist {
  id: string
  name: string
  genres?: string[]
  images?: SpotifyImage[]
  followers?: {
    total: number
  }
  external_urls: {
    spotify: string
  }
}

export interface SpotifyAlbum {
  id: string
  name: string
  artists: SpotifyArtist[]
  images: SpotifyImage[]
  release_date: string
  total_tracks: number
  external_urls: {
    spotify: string
  }
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: SpotifyArtist[]
  album?: SpotifyAlbum
  duration_ms: number
  track_number: number
  external_urls: {
    spotify: string
  }
}

export interface SpotifySearchResult {
  albums: {
    items: SpotifyAlbum[]
  }
  artists: {
    items: SpotifyArtist[]
  }
  tracks: {
    items: SpotifyTrack[]
  }
}