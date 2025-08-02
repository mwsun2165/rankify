'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { RankableItem } from './ranking-builder'

interface SortableItemProps {
  item: RankableItem
}

export function SortableItem({ item }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const isAlbum = 'artists' in item && 'total_tracks' in item
  const isTrack = 'duration_ms' in item
  const imageUrl = isTrack ? item.album?.images?.[0]?.url : item.images?.[0]?.url

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-2 p-2 bg-white border rounded-lg hover:shadow-sm cursor-grab active:cursor-grabbing transition-shadow"
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt={item.name}
          className={`w-10 h-10 object-cover ${isAlbum ? 'rounded' : 'rounded-full'}`}
        />
      )}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 truncate">{item.name}</h4>
        {isAlbum ? (
          <p className="text-xs text-gray-600 truncate">
            by {item.artists.map(artist => artist.name).join(', ')}
          </p>
        ) : isTrack ? (
          <div className="text-xs text-gray-600">
            <p className="truncate">by {item.artists.map(artist => artist.name).join(', ')}</p>
            <p className="text-xs text-gray-500">
              {Math.floor(item.duration_ms / 60000)}:{String(Math.floor((item.duration_ms % 60000) / 1000)).padStart(2, '0')}
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-600">
            {item.genres?.slice(0, 2).join(', ') || 'Artist'}
          </p>
        )}
      </div>
    </div>
  )
}