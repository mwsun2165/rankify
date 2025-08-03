'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableItem } from './sortable-item'
import type { RankableItem } from './ranking-builder'

interface ItemPoolProps {
  items: RankableItem[]
}

export function ItemPool({ items }: ItemPoolProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentTab, setCurrentTab] = useState(0)

  const { setNodeRef, isOver } = useDroppable({
    id: 'item-pool',
  })

  // Filter items based on search
  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ('artists' in item &&
        item.artists.some((artist) =>
          artist.name.toLowerCase().includes(searchQuery.toLowerCase())
        ))
  )

  // Paginate items (20 per tab)
  const itemsPerTab = 20
  const totalTabs = Math.ceil(filteredItems.length / itemsPerTab)
  const startIndex = currentTab * itemsPerTab
  const endIndex = startIndex + itemsPerTab
  const currentItems = filteredItems.slice(startIndex, endIndex)

  return (
    <div className="space-y-4">
      {/* Search within pool */}
      {items.length > 5 && (
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setCurrentTab(0) // Reset to first tab when searching
          }}
          placeholder="Search your items..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      )}

      {/* Tabs */}
      {totalTabs > 1 && (
        <div className="flex gap-1 overflow-x-auto">
          {Array.from({ length: totalTabs }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentTab(i)}
              className={`px-3 py-1 text-sm rounded transition-colors flex-shrink-0 ${
                currentTab === i
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Pool items */}
      <div
        ref={setNodeRef}
        className={`min-h-32 p-4 border-2 border-dashed rounded-lg transition-colors ${
          isOver
            ? 'border-green-500 bg-green-50'
            : items.length === 0
              ? 'border-gray-300 bg-gray-50'
              : 'border-gray-300 bg-white'
        }`}
      >
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-gray-500">
            <p>Search and add items to build your pool</p>
          </div>
        ) : currentItems.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-gray-500">
            <p>No items match your search</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {currentItems.map((item) => (
              <SortableItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Pool info */}
      {items.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          {filteredItems.length === items.length
            ? `${items.length} items in pool`
            : `${filteredItems.length} of ${items.length} items shown`}
          {totalTabs > 1 && ` • Page ${currentTab + 1} of ${totalTabs}`}
        </p>
      )}
    </div>
  )
}
