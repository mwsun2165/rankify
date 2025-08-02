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
  pointerWithin
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { RankingBox } from './ranking-box'
import { ItemPool } from './item-pool'
import { SearchInterface } from './search-interface'
import { DragOverlay as CustomDragOverlay } from './drag-overlay'
import { getArtistAlbums, getAlbumTracks, getArtistTopTracks } from '@/lib/spotify-detailed'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import type { SpotifyAlbum, SpotifyArtist, SpotifyTrack } from '@/types/spotify'

export type RankableItem = SpotifyAlbum | SpotifyArtist | SpotifyTrack

export function RankingBuilder() {
  const searchParams = useSearchParams()
  const [rankingType, setRankingType] = useState<'album' | 'artist' | 'songs'>('album')
  const [rankedItems, setRankedItems] = useState<RankableItem[]>([])
  const [poolItems, setPoolItems] = useState<RankableItem[]>([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeItem, setActiveItem] = useState<RankableItem | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize from URL parameters
  useEffect(() => {
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
    }
  }, [searchParams])

  const loadPoolItems = async (type: 'albums' | 'songs', artistId?: string | null, albumId?: string | null) => {
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

  const handleAddToPool = useCallback((item: RankableItem) => {
    // Check if item is already in pool or ranked
    const isInPool = poolItems.some(poolItem => poolItem.id === item.id)
    const isRanked = rankedItems.some(rankedItem => rankedItem.id === item.id)
    
    if (!isInPool && !isRanked) {
      setPoolItems(prev => [...prev, item])
    }
  }, [poolItems, rankedItems])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const activeId = active.id as string
    
    // Find the active item
    const item = [...rankedItems, ...poolItems].find(item => item.id === activeId)
    setActiveItem(item || null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find the active item
    const activeItem = [...rankedItems, ...poolItems].find(item => item.id === activeId)
    if (!activeItem) return

    // Handle dragging over ranking box
    if (overId === 'ranking-box') {
      // Move from pool to ranking if not already there
      if (poolItems.some(item => item.id === activeId)) {
        setPoolItems(prev => prev.filter(item => item.id !== activeId))
        setRankedItems(prev => [...prev, activeItem])
      }
      return
    }

    // Handle dragging over item pool
    if (overId === 'item-pool') {
      // Move from ranking to pool if not already there
      if (rankedItems.some(item => item.id === activeId)) {
        setRankedItems(prev => prev.filter(item => item.id !== activeId))
        setPoolItems(prev => [...prev, activeItem])
      }
      return
    }

    // Handle reordering within ranking
    const activeIndex = rankedItems.findIndex(item => item.id === activeId)
    const overIndex = rankedItems.findIndex(item => item.id === overId)

    if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
      setRankedItems(prev => arrayMove(prev, activeIndex, overIndex))
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    setActiveItem(null)

    if (!over) {
      // If dropped outside any droppable area, return item to pool if it was in ranking
      const activeId = active.id as string
      const activeItem = rankedItems.find(item => item.id === activeId)
      
      if (activeItem) {
        setRankedItems(prev => prev.filter(item => item.id !== activeId))
        setPoolItems(prev => [...prev, activeItem])
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
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('You must be logged in to save rankings')
        return
      }

      // Save the ranking
      const { saveRanking } = await import('@/lib/rankings')
      
      const rankingId = await saveRanking({
        title: title.trim(),
        ranking_type: rankingType === 'songs' ? 'songs' : rankingType === 'albums' ? 'albums' : 'artists',
        is_public: true, // Default to public for now
        items: rankedItems
      }, user.id)

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
      <div className="space-y-8">
        {/* Title Input */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
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

        {/* Ranking Type Display */}
        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-lg font-medium ${
            rankingType === 'albums'
              ? 'bg-blue-500 text-white'
              : rankingType === 'songs'
                ? 'bg-green-500 text-white'
                : 'bg-purple-500 text-white'
          }`}>
            {rankingType === 'albums' ? 'Albums' : rankingType === 'songs' ? 'Songs' : 'Artists'}
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              <span className="text-sm">Loading items...</span>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
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
            
            <SortableContext items={rankedItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
              <RankingBox items={rankedItems} />
            </SortableContext>
          </div>

          {/* Right Column - Search & Pool */}
          <div className="space-y-6">
            {/* Search - only show if not pre-populated */}
            {!searchParams.get('type') && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Search & Add Items</h3>
                <SearchInterface 
                  searchType={rankingType as 'album' | 'artist'}
                  onAddItem={handleAddToPool}
                  compact={true}
                />
              </div>
            )}

            {/* Pool */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Item Pool ({poolItems.length})
              </h3>
              <ItemPool items={poolItems} />
            </div>
          </div>
        </div>
      </div>
      
      <DragOverlay modifiers={[restrictToWindowEdges]}>
        {activeItem ? <CustomDragOverlay item={activeItem} /> : null}
      </DragOverlay>
    </DndContext>
  )
}