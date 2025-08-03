'use client'

import type { RankableItem } from './ranking-builder'

interface DragOverlayProps {
  item: RankableItem
}

export function DragOverlay({ item }: DragOverlayProps) {
  const isAlbum = 'artists' in item && 'total_tracks' in item
  const isTrack = 'duration_ms' in item
  const imageUrl = isTrack
    ? item.album?.images?.[0]?.url
    : item.images?.[0]?.url

  return (
    <div className="flex items-center gap-2 p-2 bg-white border rounded-lg shadow-lg opacity-80 cursor-grabbing">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={item.name}
          className={`w-10 h-10 object-cover ${isAlbum ? 'rounded' : 'rounded-full'}`}
        />
      )}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 truncate">
          {item.name}
        </h4>
        {isAlbum ? (
          <p className="text-xs text-gray-600 truncate">
            by {item.artists.map((artist) => artist.name).join(', ')}
          </p>
        ) : isTrack ? (
          <div className="text-xs text-gray-600">
            <p className="truncate">
              by {item.artists.map((artist) => artist.name).join(', ')}
            </p>
            <p className="text-xs text-gray-500">
              {Math.floor(item.duration_ms / 60000)}:
              {String(Math.floor((item.duration_ms % 60000) / 1000)).padStart(
                2,
                '0'
              )}
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
