'use client'

import { useState, useEffect } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import {
  getUserRankings,
  getPublicRankings,
  getFriendsRankings,
} from '@/lib/rankings'
import type { Ranking } from '@rankify/db-types'

// Extended type for rankings with visibility (until types are regenerated)
type RankingWithVisibility = Ranking & {
  visibility: 'public' | 'friends' | 'private'
}

export function BrowseInterface() {
  const [activeTab, setActiveTab] = useState<
    'my-rankings' | 'friends' | 'public'
  >('my-rankings')
  const [myRankings, setMyRankings] = useState<RankingWithVisibility[]>([])
  const [publicRankings, setPublicRankings] = useState<RankingWithVisibility[]>(
    []
  )
  const [friendsRankings, setFriendsRankings] = useState<
    RankingWithVisibility[]
  >([])
  const [loading, setLoading] = useState(true)
  const [publicLoading, setPublicLoading] = useState(false)
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadInitial()
  }, [])

  const loadInitial = async () => {
    try {
      const supabase = createClientSupabaseClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const myRankingsData = await getUserRankings(user.id)
        setMyRankings(myRankingsData as RankingWithVisibility[])
      } else {
        // Not signed in – fetch public immediately
        const publicData = await getPublicRankings()
        setPublicRankings(publicData as RankingWithVisibility[])
        setActiveTab('public')
      }
    } catch (err) {
      console.error('Error loading rankings:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPublicRankings = async () => {
    try {
      setPublicLoading(true)
      const data = await getPublicRankings()
      setPublicRankings(data as RankingWithVisibility[])
    } catch (err) {
      console.error('Error fetching public rankings:', err)
    } finally {
      setPublicLoading(false)
    }
  }

  const fetchFriendsRankings = async () => {
    if (!user) return
    try {
      setFriendsLoading(true)
      const data = await getFriendsRankings(user.id)
      setFriendsRankings(data as RankingWithVisibility[])
    } catch (err) {
      console.error('Error fetching friends rankings:', err)
    } finally {
      setFriendsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'albums':
        return 'bg-blue-500'
      case 'songs':
        return 'bg-green-500'
      case 'artists':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'albums':
        return 'Albums'
      case 'songs':
        return 'Songs'
      case 'artists':
        return 'Artists'
      default:
        return type
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

  // Helper to render a ranking card (used for public + friends)
  const renderPublicCard = (ranking: RankingWithVisibility) => (
    <div
      key={ranking.id}
      className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {ranking.title}
            </h3>
            <span
              className={`px-2 py-1 text-xs text-white rounded ${getTypeColor(ranking.ranking_type)}`}
            >
              {getTypeText(ranking.ranking_type)}
            </span>
            {ranking.visibility !== 'public' && (
              <span className="px-2 py-1 text-xs bg-gray-500 text-white rounded">
                {ranking.visibility.charAt(0).toUpperCase() +
                  ranking.visibility.slice(1)}
              </span>
            )}
          </div>
          {ranking.description && (
            <p className="text-gray-600 mb-2">{ranking.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>
              by{' '}
              {(ranking as any).profiles?.display_name ||
                (ranking as any).profiles?.username ||
                'Anonymous'}
            </span>
            <span>{formatDate(ranking.created_at)}</span>
            <span>{(ranking as any).ranking_items?.length || 0} items</span>
            {'ranking_likes' in ranking && (
              <span>❤️ {(ranking as any).ranking_likes?.length || 0}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={`/browse/${ranking.id}`}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            View
          </a>
          <button className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors">
            ❤️
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Tabs */}
      {user && (
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('my-rankings')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'my-rankings' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            My Rankings
          </button>
          <button
            onClick={() => {
              setActiveTab('friends')
              if (friendsRankings.length === 0 && !friendsLoading)
                fetchFriendsRankings()
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'friends' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Friends
          </button>
          <button
            onClick={() => {
              setActiveTab('public')
              if (publicRankings.length === 0 && !publicLoading)
                fetchPublicRankings()
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'public' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Public
          </button>
        </div>
      )}

      {/* Rankings List */}
      <div className="space-y-4">
        {/* My Rankings */}
        {activeTab === 'my-rankings' &&
          user &&
          (myRankings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4">You haven&apos;t created any rankings yet.</p>
              <a
                href="/search"
                className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Create Your First Ranking
              </a>
            </div>
          ) : (
            myRankings.map((ranking) => (
              <div
                key={ranking.id}
                className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {ranking.title}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs text-white rounded ${getTypeColor(ranking.ranking_type)}`}
                      >
                        {getTypeText(ranking.ranking_type)}
                      </span>
                      {ranking.visibility !== 'public' && (
                        <span className="px-2 py-1 text-xs bg-gray-500 text-white rounded">
                          {ranking.visibility.charAt(0).toUpperCase() +
                            ranking.visibility.slice(1)}
                        </span>
                      )}
                    </div>
                    {ranking.description && (
                      <p className="text-gray-600 mb-2">
                        {ranking.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Updated {formatDate(ranking.updated_at)}</span>
                      <span>
                        {(ranking as any).ranking_items?.length || 0} items
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <select
                      className="border rounded px-2 py-1 text-xs"
                      value={ranking.visibility}
                      onChange={async (e) => {
                        const newVis = e.target.value as
                          | 'public'
                          | 'friends'
                          | 'private'
                        const supabase = createClientSupabaseClient()
                        const { error } = await supabase
                          .from('rankings')
                          .update({ visibility: newVis } as any)
                          .eq('id', ranking.id)
                        if (!error) {
                          setMyRankings((prev) =>
                            prev.map((r) =>
                              r.id === ranking.id
                                ? ({ ...r, visibility: newVis } as any)
                                : r
                            )
                          )
                        }
                      }}
                    >
                      <option value="public">Public</option>
                      <option value="friends">Friends</option>
                      <option value="private">Private</option>
                    </select>
                    <a
                      href={`/browse/${ranking.id}`}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      View
                    </a>
                    <a
                      href={`/rank?id=${ranking.id}`}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Edit
                    </a>
                    <button
                      onClick={async () => {
                        if (!confirm('Delete this ranking?')) return
                        const supabase = createClientSupabaseClient()
                        const { error } = await supabase
                          .from('rankings')
                          .delete()
                          .eq('id', ranking.id)
                        if (!error) {
                          setMyRankings((prev) =>
                            prev.filter((r) => r.id !== ranking.id)
                          )
                        }
                      }}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          ))}

        {/* Friends Rankings */}
        {activeTab === 'friends' &&
          (friendsLoading ? (
            <div className="text-center py-12 text-gray-500">
              Loading friend rankings...
            </div>
          ) : friendsRankings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No rankings from friends yet.
            </div>
          ) : (
            friendsRankings.map(renderPublicCard)
          ))}

        {/* Public Rankings */}
        {activeTab === 'public' &&
          (publicLoading && publicRankings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Loading public rankings...
            </div>
          ) : publicRankings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No public rankings found.
            </div>
          ) : (
            publicRankings.map(renderPublicCard)
          ))}
      </div>
    </div>
  )
}
