'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import { searchSpotify } from '@/lib/spotify'
import type {
  SpotifySearchResult,
  SpotifyAlbum,
  SpotifyArtist,
  SpotifyTrack,
} from '@/types/spotify'

interface SearchInterfaceProps {
  allowTrackSearch?: boolean
  searchType?: 'album' | 'artist'
  onAddItem?: (item: SpotifyAlbum | SpotifyArtist | SpotifyTrack) => void
  compact?: boolean
  showRankingButtons?: boolean
}

export function SearchInterface({
  searchType: propSearchType,
  allowTrackSearch = false,
  onAddItem,
  compact = false,
  showRankingButtons = false,
}: SearchInterfaceProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpotifySearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchType, setSearchType] = useState<'album' | 'artist' | 'track'>(
    propSearchType || 'album'
  )

  const abortControllerRef = useRef<AbortController | null>(null)

  const debouncedQuery = useDebounce(query, 300)

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults(null)
        return
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController()

      setLoading(true)
      setError(null)

      try {
        const searchResults = await searchSpotify(
          searchQuery,
          searchType,
          abortControllerRef.current.signal
        )
        setResults(searchResults)
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Search failed')
          setResults(null)
        }
      } finally {
        setLoading(false)
      }
    },
    [searchType]
  )

  // Trigger search when debounced query changes
  useEffect(() => {
    performSearch(debouncedQuery)
  }, [debouncedQuery, performSearch])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }

  const handleTypeChange = (type: 'album' | 'artist' | 'track') => {
    setSearchType(type)
    if (query.trim()) {
      performSearch(query)
    }
  }

  // Update search type when prop changes
  useEffect(() => {
    if (propSearchType && propSearchType !== searchType) {
      setSearchType(propSearchType)
      if (query.trim()) {
        performSearch(query)
      }
    }
  }, [propSearchType, searchType, query, performSearch])

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {/* Search Type Toggle - hide if controlled by parent */}
      {!propSearchType && (
        <div className="flex gap-2">
          <button
            onClick={() => handleTypeChange('album')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              searchType === 'album'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Albums
          </button>
          <button
            onClick={() => handleTypeChange('artist')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              searchType === 'artist'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Artists
          </button>
          {allowTrackSearch && (
            <button
              onClick={() => handleTypeChange('track')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                searchType === 'track'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Songs
            </button>
          )}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={`Search for ${searchType}s...`}
          className={`w-full px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
            compact ? 'py-2 text-sm' : 'py-3'
          }`}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">
            {searchType === 'album'
              ? 'Albums'
              : searchType === 'artist'
                ? 'Artists'
                : 'Songs'}{' '}
            (
            {searchType === 'album'
              ? results.albums.items.length
              : searchType === 'artist'
                ? results.artists.items.length
                : results.tracks.items.length}
            )
          </h3>

          <div
            className={`grid gap-3 ${compact ? 'max-h-64 overflow-y-auto' : ''}`}
          >
            {searchType === 'album' &&
              results.albums.items.slice(0, compact ? 5 : 10).map((album) => (
                <div
                  key={album.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${compact ? 'p-3' : 'p-4'}`}
                >
                  {album.images[0] && (
                    <img
                      src={album.images[0].url}
                      alt={album.name}
                      className={`rounded-lg object-cover ${compact ? 'w-12 h-12' : 'w-16 h-16'}`}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`font-medium text-gray-900 truncate ${compact ? 'text-sm' : ''}`}
                    >
                      {album.name}
                    </h4>
                    <p
                      className={`text-gray-600 truncate ${compact ? 'text-xs' : 'text-sm'}`}
                    >
                      by {album.artists.map((artist) => artist.name).join(', ')}
                    </p>
                    {!compact && (
                      <p className="text-xs text-gray-500">
                        {album.release_date} • {album.total_tracks} tracks
                      </p>
                    )}
                  </div>
                  {showRankingButtons ? (
                    <a
                      href={`/rank?type=songs&albumId=${album.id}&albumName=${encodeURIComponent(album.name)}&artistName=${encodeURIComponent(album.artists[0].name)}`}
                      className={`text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors ${compact ? 'px-2 py-1' : 'px-3 py-1'} inline-block`}
                    >
                      Rank Songs
                    </a>
                  ) : (
                    <button
                      onClick={() => onAddItem?.(album)}
                      className={`text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors ${compact ? 'px-2 py-1' : 'px-3 py-1'}`}
                    >
                      Add
                    </button>
                  )}
                </div>
              ))}

            {searchType === 'artist' &&
              results.artists.items.slice(0, compact ? 5 : 10).map((artist) => (
                <div
                  key={artist.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${compact ? 'p-3' : 'p-4'}`}
                >
                  {artist.images?.[0] && (
                    <img
                      src={artist.images[0].url}
                      alt={artist.name}
                      className={`rounded-full object-cover ${compact ? 'w-12 h-12' : 'w-16 h-16'}`}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`font-medium text-gray-900 truncate ${compact ? 'text-sm' : ''}`}
                    >
                      {artist.name}
                    </h4>
                    <p
                      className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'}`}
                    >
                      {artist.genres?.slice(0, 3).join(', ') || 'Artist'}
                    </p>
                    {!compact && (
                      <p className="text-xs text-gray-500">
                        {artist.followers?.total.toLocaleString()} followers
                      </p>
                    )}
                  </div>
                  {showRankingButtons ? (
                    <div className="flex gap-2">
                      <a
                        href={`/rank?type=albums&artistId=${artist.id}&artistName=${encodeURIComponent(artist.name)}`}
                        className={`text-sm bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors ${compact ? 'px-2 py-1' : 'px-3 py-1'} inline-block`}
                      >
                        Rank Albums
                      </a>
                      <a
                        href={`/rank?type=songs&artistId=${artist.id}&artistName=${encodeURIComponent(artist.name)}`}
                        className={`text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors ${compact ? 'px-2 py-1' : 'px-3 py-1'} inline-block`}
                      >
                        Rank Songs
                      </a>
                    </div>
                  ) : (
                    <button
                      onClick={() => onAddItem?.(artist)}
                      className={`text-sm bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors ${compact ? 'px-2 py-1' : 'px-3 py-1'}`}
                    >
                      Add
                    </button>
                  )}
                </div>
              ))}

            {searchType === 'track' &&
              results.tracks.items.slice(0, compact ? 5 : 10).map((track) => (
                <div
                  key={track.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${compact ? 'p-3' : 'p-4'}`}
                >
                  {track.album?.images?.[0] && (
                    <img
                      src={track.album.images[0].url}
                      alt={track.name}
                      className={`rounded object-cover ${compact ? 'w-12 h-12' : 'w-16 h-16'}`}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`font-medium text-gray-900 truncate ${compact ? 'text-sm' : ''}`}
                    >
                      {track.name}
                    </h4>
                    <p
                      className={`text-gray-600 truncate ${compact ? 'text-xs' : 'text-sm'}`}
                    >
                      {track.artists.map((a) => a.name).join(', ')}
                    </p>
                    {!compact && (
                      <p className="text-xs text-gray-500">
                        {Math.floor(track.duration_ms / 60000)}:
                        {String(
                          Math.floor((track.duration_ms % 60000) / 1000)
                        ).padStart(2, '0')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onAddItem?.(track)}
                    className={`text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors ${compact ? 'px-2 py-1' : 'px-3 py-1'}`}
                  >
                    Add
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !results && query.trim() && (
        <div className="text-center py-12 text-gray-500">
          <p>No results found for &quot;{query}&quot;</p>
        </div>
      )}

      {/* Initial State */}
      {!query.trim() && (
        <div className="text-center py-12 text-gray-500">
          <p>Start typing to search for {searchType}s...</p>
        </div>
      )}
    </div>
  )
}
