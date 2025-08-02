'use client'

import { useState, useEffect } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { getUserRankings, getPublicRankings } from '@/lib/rankings'
import type { Ranking } from '@rankify/db-types'

export function BrowseInterface() {
  const [activeTab, setActiveTab] = useState<'my-rankings' | 'public'>('my-rankings')
  const [myRankings, setMyRankings] = useState<Ranking[]>([])
  const [publicRankings, setPublicRankings] = useState<Ranking[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const supabase = createClientSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const [myRankingsData, publicRankingsData] = await Promise.all([
          getUserRankings(user.id),
          getPublicRankings()
        ])
        setMyRankings(myRankingsData)
        setPublicRankings(publicRankingsData)
      } else {
        const publicRankingsData = await getPublicRankings()
        setPublicRankings(publicRankingsData)
      }
    } catch (error) {
      console.error('Error loading rankings:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'albums': return 'bg-blue-500'
      case 'songs': return 'bg-green-500'
      case 'artists': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'albums': return 'Albums'
      case 'songs': return 'Songs'
      case 'artists': return 'Artists'
      default: return type
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading rankings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      {user && (
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('my-rankings')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'my-rankings'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            My Rankings ({myRankings.length})
          </button>
          <button
            onClick={() => setActiveTab('public')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'public'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Public Rankings ({publicRankings.length})
          </button>
        </div>
      )}

      {/* Rankings List */}
      <div className="space-y-4">
        {activeTab === 'my-rankings' && user ? (
          myRankings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4">You haven't created any rankings yet.</p>
              <a
                href="/search"
                className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Create Your First Ranking
              </a>
            </div>
          ) : (
            myRankings.map((ranking) => (
              <div key={ranking.id} className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{ranking.title}</h3>
                      <span className={`px-2 py-1 text-xs text-white rounded ${getTypeColor(ranking.ranking_type)}`}>
                        {getTypeText(ranking.ranking_type)}
                      </span>
                      {!ranking.is_public && (
                        <span className="px-2 py-1 text-xs bg-gray-500 text-white rounded">
                          Private
                        </span>
                      )}
                    </div>
                    {ranking.description && (
                      <p className="text-gray-600 mb-2">{ranking.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Created {formatDate(ranking.created_at)}</span>
                      <span>{(ranking as any).ranking_items?.length || 0} items</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                      View
                    </button>
                    <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          publicRankings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No public rankings found.</p>
            </div>
          ) : (
            publicRankings.map((ranking) => (
              <div key={ranking.id} className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{ranking.title}</h3>
                      <span className={`px-2 py-1 text-xs text-white rounded ${getTypeColor(ranking.ranking_type)}`}>
                        {getTypeText(ranking.ranking_type)}
                      </span>
                    </div>
                    {ranking.description && (
                      <p className="text-gray-600 mb-2">{ranking.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>by {(ranking as any).profiles?.display_name || (ranking as any).profiles?.username || 'Anonymous'}</span>
                      <span>{formatDate(ranking.created_at)}</span>
                      <span>{(ranking as any).ranking_items?.length || 0} items</span>
                      <span>❤️ {(ranking as any).ranking_likes?.length || 0}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                      View
                    </button>
                    <button className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
                      ❤️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  )
}