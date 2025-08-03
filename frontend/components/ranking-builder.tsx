'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  closestCenter,
  DragOverlay,
  pointerWithin,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { RankingBox } from './ranking-box'
import { ItemPool } from './item-pool'
import { SearchInterface } from './search-interface'
import { DragOverlay as CustomDragOverlay } from './drag-overlay'
import {
  getArtistAlbums,
  getAlbumTracks,
  getArtistTopTracks,
} from '@/lib/spotify-detailed'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import type { SpotifyAlbum, SpotifyArtist, SpotifyTrack } from '@/types/spotify'

export type RankableItem = SpotifyAlbum | SpotifyArtist | SpotifyTrack

export function RankingBuilder() {
  const searchParams = useSearchParams()
  const [rankingType, setRankingType] = useState<
    'albums' | 'artists' | 'songs'
  >('albums')
  const [rankedItems, setRankedItems] = useState<RankableItem[]>([])
  const [poolItems, setPoolItems] = useState<RankableItem[]>([])
  const [fixedPool, setFixedPool] = useState(false)
  const [rankingId, setRankingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeItem, setActiveItem] = useState<RankableItem | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize from URL parameters OR edit mode
  useEffect(() => {
    const editId = searchParams.get('id')
    if (editId) {
      // Editing existing ranking
      ;(async () => {
        const supabase = createClientSupabaseClient()
        const { data, error } = await supabase
          .from('rankings')
          .select(`*, ranking_items(position,item_id)`)
          .eq('id', editId)
          .single()
        if (error || !data) return

        setRankingId(editId)
        setTitle(data.title)
        setRankingType(data.ranking_type as any)

        // Fetch metadata for ranked items from DB
        const allIds = Array.from(
          new Set([...data.ranking_items.map((ri: any) => ri.item_id)])
        )
        if (allIds.length) {
          let table: string =
            data.ranking_type === 'artists'
              ? 'artists'
              : data.ranking_type === 'albums'
                ? 'albums'
                : 'tracks'
          const { data: meta } = await supabase
            .from(table as any)
            .select('*')
            .in('id', allIds)

          // Build artist map for albums to include artist names
          let artistMap: Record<string, string> = {}
          if (data.ranking_type === 'albums' && meta && meta.length) {
            const artistIds = Array.from(
              new Set(meta.map((row: any) => row.artist_id).filter(Boolean))
            )
            if (artistIds.length) {
              const { data: artists } = await supabase
                .from('artists')
                .select('id, name')
                .in('id', artistIds)
              artistMap = Object.fromEntries(
                (artists || []).map((a: any) => [a.id, a.name])
              )
            }
          }

          const toSpotify = (row: any) => {
            if (data.ranking_type === 'artists') {
              return {
                id: row.id,
                name: row.name,
                images: row.image_url ? [{ url: row.image_url }] : [],
                genres: row.genres || [],
                followers: { total: row.popularity || 0 },
                external_urls: { spotify: row.spotify_url },
              }
            } else if (data.ranking_type === 'albums') {
              return {
                id: row.id,
                name: row.name,
                images: row.image_url ? [{ url: row.image_url }] : [],
                artists: [
                  { id: row.artist_id, name: artistMap[row.artist_id] || '' },
                ],
                total_tracks: row.total_tracks,
                release_date: row.release_date,
                external_urls: { spotify: row.spotify_url },
              }
            } else {
              return {
                id: row.id,
                name: row.name,
                album: {
                  images: row.image_url ? [{ url: row.image_url }] : [],
                },
                duration_ms: row.duration_ms,
                artists: [],
                external_urls: { spotify: row.spotify_url },
              }
            }
          }

          const metaMap: Record<string, any> = {}
          meta?.forEach((row: any) => {
            metaMap[row.id] = toSpotify(row)
          })

          // Fallback: if some album metadata is missing (e.g. not cached in DB yet)
          const rankedIds: string[] = data.ranking_items.map(
            (ri: any) => ri.item_id
          )
          const missingIds = rankedIds.filter((id) => !metaMap[id])
          if (missingIds.length && data.ranking_type === 'albums') {
            try {
              const { makeSpotifyRequest, SPOTIFY_API_BASE } = await import(
                '@/lib/spotify-server'
              )
              for (const albumId of missingIds) {
                const res = await makeSpotifyRequest(
                  `${SPOTIFY_API_BASE}/albums/${albumId}`
                )
                if (res.ok) {
                  const albumJson: any = await res.json()
                  // Update artist map if needed
                  if (albumJson.artists?.length) {
                    const a = albumJson.artists[0]
                    artistMap[a.id] = a.name
                  }
                  // Convert to SpotifyAlbum shape that our components expect
                  metaMap[albumJson.id] = {
                    id: albumJson.id,
                    name: albumJson.name,
                    images: albumJson.images || [],
                    artists: albumJson.artists,
                    total_tracks: albumJson.total_tracks,
                    release_date: albumJson.release_date,
                    external_urls: albumJson.external_urls,
                  }
                }
              }
            } catch (err) {
              console.error(
                'Failed to fetch missing album metadata for editor',
                err
              )
            }
          }

          setRankedItems(
            data.ranking_items
              .sort((a: any, b: any) => a.position - b.position)
              .map((ri: any) => metaMap[ri.item_id])
              .filter(Boolean)
          )
          // Pool items are not stored in database, start with empty pool
          setPoolItems([])
        }

        if ((data as any).source_type && (data as any).source_id) {
          setFixedPool(true)
        }
      })()
      return
    }

    // Creating new ranking from query params
    const type = searchParams.get('type') as 'albums' | 'songs' | null
    const artistId = searchParams.get('artistId')
    const albumId = searchParams.get('albumId')
    const artistName = searchParams.get('artistName')
    const albumName = searchParams.get('albumName')

    if (type && (artistId || albumId)) {
      setRankingType(type)

      // Set default title
      if (type === 'albums' && artistName) {
        setTitle(`${artistName} - Albums Ranking`)
      } else if (type === 'songs' && albumName && artistName) {
        setTitle(`${albumName} by ${artistName} - Songs Ranking`)
      } else if (type === 'songs' && artistName) {
        setTitle(`${artistName} - Songs Ranking`)
      }

      // Load items into pool
      loadPoolItems(type, artistId, albumId)
      setFixedPool(true)
    }
  }, [searchParams])

  const loadPoolItems = async (
    type: 'albums' | 'songs',
    artistId?: string | null,
    albumId?: string | null
  ) => {
    if (!artistId && !albumId) return

    setLoading(true)
    try {
      let items: RankableItem[] = []

      if (type === 'albums' && artistId) {
        items = await getArtistAlbums(artistId)
      } else if (type === 'songs' && albumId) {
        items = await getAlbumTracks(albumId)
      } else if (type === 'songs' && artistId) {
        items = await getArtistTopTracks(artistId)
      }

      setPoolItems(items)
    } catch (error) {
      console.error('Failed to load pool items:', error)
      alert('Failed to load items. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToPool = useCallback(
    (item: RankableItem) => {
      // Check if item is already in pool or ranked
      const isInPool = poolItems.some((poolItem) => poolItem.id === item.id)
      const isRanked = rankedItems.some(
        (rankedItem) => rankedItem.id === item.id
      )

      if (!isInPool && !isRanked) {
        setPoolItems((prev) => [...prev, item])
      }
    },
    [poolItems, rankedItems]
  )

  // Handle user switching ranking type (Artists / Albums / Songs)
  const handleRankingTypeChange = (type: 'albums' | 'artists' | 'songs') => {
    if (fixedPool) return
    if (type === rankingType) return
    // Reset all state when changing type
    setRankingType(type)
    setRankedItems([])
    setPoolItems([])
    // Keep title but optional reset could be setTitle('') if desired
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const activeId = active.id as string

    // Find the active item
    const item = [...rankedItems, ...poolItems].find(
      (item) => item.id === activeId
    )
    setActiveItem(item || null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find the active item
    const activeItem = [...rankedItems, ...poolItems].find(
      (item) => item.id === activeId
    )
    if (!activeItem) return

    // Handle dragging over ranking box
    if (overId === 'ranking-box') {
      // Move from pool to ranking if not already there
      if (poolItems.some((item) => item.id === activeId)) {
        setPoolItems((prev) => prev.filter((item) => item.id !== activeId))
        setRankedItems((prev) => [...prev, activeItem])
      }
      return
    }

    // Handle dragging over item pool
    if (overId === 'item-pool') {
      // Move from ranking to pool if not already there
      if (rankedItems.some((item) => item.id === activeId)) {
        setRankedItems((prev) => prev.filter((item) => item.id !== activeId))
        setPoolItems((prev) => [...prev, activeItem])
      }
      return
    }

    // Handle reordering within ranking
    const activeIndex = rankedItems.findIndex((item) => item.id === activeId)
    const overIndex = rankedItems.findIndex((item) => item.id === overId)

    if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
      setRankedItems((prev) => arrayMove(prev, activeIndex, overIndex))
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    setActiveItem(null)

    if (!over) {
      // If dropped outside any droppable area, return item to pool if it was in ranking
      const activeId = active.id as string
      const activeItem = rankedItems.find((item) => item.id === activeId)

      if (activeItem) {
        setRankedItems((prev) => prev.filter((item) => item.id !== activeId))
        setPoolItems((prev) => [...prev, activeItem])
      }
      return
    }

    // The actual positioning is handled in handleDragOver
    // This just cleans up any final state
  }

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title for your ranking')
      return
    }

    if (rankedItems.length === 0) {
      alert('Please add at least one item to your ranking')
      return
    }

    setIsSaving(true)

    try {
      // Get current user
      const supabase = createClientSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        alert('You must be logged in to save rankings')
        return
      }

      // Save the ranking
      const { saveRanking, updateRanking } = await import('@/lib/rankings')

      if (rankingId) {
        await updateRanking(rankingId, {
          title: title.trim(),
          ranking_type: rankingType,
          visibility: 'public',
          items: rankedItems,
          pool_items: poolItems,
          source_type: fixedPool
            ? ((searchParams.get('artistId')
                ? 'artist'
                : searchParams.get('albumId')
                  ? 'album'
                  : undefined) as any)
            : undefined,
          source_id: fixedPool
            ? searchParams.get('artistId') ||
              searchParams.get('albumId') ||
              undefined
            : undefined,
        })
      } else {
        const newId = await saveRanking(
          {
            title: title.trim(),
            ranking_type: rankingType,
            visibility: 'public',
            items: rankedItems,
            pool_items: poolItems,
            source_type:
              searchParams.get('artistId') || searchParams.get('albumId')
                ? ((searchParams.get('artistId') ? 'artist' : 'album') as any)
                : undefined,
            source_id:
              searchParams.get('artistId') ||
              searchParams.get('albumId') ||
              undefined,
          },
          user.id
        )
      }

      // Redirect to browse page to see the saved ranking
      window.location.href = '/browse'
    } catch (error) {
      console.error('Failed to save ranking:', error)
      alert('Failed to save ranking. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="space-y-8 overflow-x-hidden">
        {/* Title Input */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Ranking Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Top Albums of 2024"
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Ranking Type Toggle */}
        <div className="flex items-center gap-4">
          {(['artists', 'albums', 'songs'] as const).map((type) => (
            <button
              key={type}
              onClick={() => handleRankingTypeChange(type)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                rankingType === type
                  ? type === 'artists'
                    ? 'bg-purple-500 text-white'
                    : type === 'albums'
                      ? 'bg-blue-500 text-white'
                      : 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              <span className="text-sm">Loading items...</span>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-full">
          {/* Left Column - Ranking Box */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Your Ranking</h2>
              <button
                onClick={handleSave}
                disabled={rankedItems.length === 0 || !title.trim() || isSaving}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  'Save Ranking'
                )}
              </button>
            </div>

            <SortableContext
              items={rankedItems.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <RankingBox items={rankedItems} />
            </SortableContext>
          </div>

          {/* Right Column - Pool & Search */}
          <div className="space-y-6">
            {/* Pool */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Item Pool ({poolItems.length})
              </h3>
              <ItemPool items={poolItems} />
            </div>

            {/* Search - only show if pool is flexible */}
            {!fixedPool && (
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Search & Add Items
                </h3>
                <SearchInterface
                  key={rankingType}
                  allowTrackSearch={true}
                  searchType={
                    rankingType === 'albums' ? 'album' : 'artist' // default to artist for songs and other types
                  }
                  onAddItem={handleAddToPool}
                  compact={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <DragOverlay modifiers={[restrictToWindowEdges]}>
        {activeItem ? <CustomDragOverlay item={activeItem} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
