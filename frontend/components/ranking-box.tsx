'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableItem } from './sortable-item'
import type { RankableItem } from './ranking-builder'

interface RankingBoxProps {
  items: RankableItem[]
}

export function RankingBox({ items }: RankingBoxProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'ranking-box',
  })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-96 p-4 border-2 border-dashed rounded-lg transition-colors ${
        isOver
          ? 'border-blue-500 bg-blue-50'
          : items.length === 0
            ? 'border-gray-300 bg-gray-50'
            : 'border-gray-300 bg-white'
      }`}
    >
      {items.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-500">
          <p>Drag items here to rank them</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                {index + 1}
              </div>
              <div className="flex-1">
                <SortableItem item={item} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
