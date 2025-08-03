'use client'

import { useEffect, useState } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import type { Ranking } from '@rankify/db-types'
import { RankingView } from '@/components/ranking-view'

interface FriendProfile {
  id: string
  display_name: string | null
  username: string | null
  avatar_url: string | null
}

interface FullRankingWithItems {
  ranking: any
  items: any[]
}

export default function CompareRankingsPage() {
  const supabase = createClientSupabaseClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [myRankings, setMyRankings] = useState<Ranking[]>([])
  const [selectedMyRanking, setSelectedMyRanking] = useState<Ranking | null>(null)

  const [friends, setFriends] = useState<FriendProfile[]>([])
  const [friendRankings, setFriendRankings] = useState<Ranking[]>([])
  const [selectedFriendRanking, setSelectedFriendRanking] = useState<Ranking | null>(null)

  const [loadingUser, setLoadingUser] = useState(true)
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [loadingRankings, setLoadingRankings] = useState(false)

  const [myFull, setMyFull] = useState<FullRankingWithItems | null>(null)
  const [friendFull, setFriendFull] = useState<FullRankingWithItems | null>(null)

  /* ------------------------ initial user + own rankings ----------------------- */
  useEffect(() => {
    const init = async () => {
      setLoadingUser(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoadingUser(false)
        return
      }
      setUserId(user.id)

      const { data, error } = await supabase
        .from('rankings')
        .select('*')
        .eq('user_id', user.id)
        .not('source_type', 'is', null)
        .order('created_at', { ascending: false })
      if (!error) setMyRankings(data as Ranking[])
      setLoadingUser(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* -------------------------- when my ranking chosen -------------------------- */
  useEffect(() => {
    if (!selectedMyRanking) return
    const loadFriendsAndRankings = async () => {
      setLoadingFriends(true)
      // 1. Determine friends (mutual follows)
      if (!userId) return

      // IDs the user follows
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
      const followingIds = (following || []).map((f: any) => f.following_id)
      if (followingIds.length === 0) {
        setFriends([])
        setFriendRankings([])
        setLoadingFriends(false)
        return
      }
      // Those that follow back
      const { data: mutual } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId)
        .in('follower_id', followingIds)
      const friendIds = (mutual || []).map((m: any) => m.follower_id)

      if (friendIds.length === 0) {
        setFriends([])
        setFriendRankings([])
        setLoadingFriends(false)
        return
      }
      // Friend profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', friendIds)
      setFriends(profiles as FriendProfile[])

      // 2. Fetch friend fixed rankings matching pool (source_type & source_id)
      setLoadingRankings(true)
      const { data: frRanks } = await supabase
        .from('rankings')
        .select('*')
        .eq('source_type', selectedMyRanking.source_type)
        .eq('source_id', selectedMyRanking.source_id)
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
      setFriendRankings(frRanks as Ranking[])
      setLoadingRankings(false)
      setLoadingFriends(false)
    }
    loadFriendsAndRankings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMyRanking])

  /* --------------------------- load full rankings ---------------------------- */
  useEffect(() => {
    const fetchFull = async () => {
      if (!selectedMyRanking) return
      // Fetch my full ranking (items metadata)
      const { data: full } = await supabase.rpc('get_full_ranking', { ranking_uuid: selectedMyRanking.id })
      // The RPC may not exist; fallback to manual
      if (!full) {
        // fallback simple fetch of ranking_items and no meta
        const { data: fallback } = await supabase
          .from('rankings')
          .select('*, ranking_items(*)')
          .eq('id', selectedMyRanking.id)
          .single()
        setMyFull({ ranking: fallback, items: [] })
      } else {
        setMyFull(full as any)
      }
    }
    fetchFull()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMyRanking])

  useEffect(() => {
    const fetchFriendFull = async () => {
      if (!selectedFriendRanking) return
      const { data: full } = await supabase.rpc('get_full_ranking', { ranking_uuid: selectedFriendRanking.id })
      if (!full) {
        const { data: fallback } = await supabase
          .from('rankings')
          .select('*, ranking_items(*)')
          .eq('id', selectedFriendRanking.id)
          .single()
        setFriendFull({ ranking: fallback, items: [] })
      } else {
        setFriendFull(full as any)
      }
    }
    fetchFriendFull()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFriendRanking])

  /* --------------------------------- helpers --------------------------------- */
  const renderRankingCard = (r: Ranking, onClick: () => void, isSelected: boolean) => (
    <button
      key={r.id}
      onClick={onClick}
      className={`w-full text-left p-3 border rounded-lg mb-2 hover:shadow-sm transition-shadow ${isSelected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'}`}
    >
      <p className="font-medium text-gray-900 mb-1 truncate">{r.title}</p>
      <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</p>
    </button>
  )

  const renderFriendRankingCard = (r: Ranking, onClick: () => void, isSelected: boolean) => {
    const friend = friends.find((f) => f.id === r.user_id)
    const friendName = friend?.display_name || friend?.username || 'Unknown'
    return (
      <button
        key={r.id}
        onClick={onClick}
        className={`w-full text-left p-3 border rounded-lg mb-2 hover:shadow-sm transition-shadow ${isSelected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'}`}
      >
        <p className="font-medium text-gray-900 truncate">{friendName}</p>
        <p className="text-xs text-gray-500">Variant {r.source_variant || 1}</p>
      </button>
    )
  }

  /* ---------------------------------- render --------------------------------- */
  return (
    <main className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left – my fixed rankings */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Your Fixed Rankings</h2>
          {loadingUser ? (
            <p>Loading...</p>
          ) : myRankings.length === 0 ? (
            <p className="text-sm text-gray-600">No fixed rankings yet.</p>
          ) : (
            myRankings.map((r) =>
              renderRankingCard(r, () => {
                setSelectedMyRanking(r)
                // reset friend selection when changing source ranking
                setSelectedFriendRanking(null)
                setFriendFull(null)
              }, selectedMyRanking?.id === r.id)
            )
          )}
        </div>

        {/* Right – friends rankings */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Friend Rankings</h2>
          {!selectedMyRanking ? (
            <p className="text-sm text-gray-600">Select one of your fixed rankings first.</p>
          ) : loadingFriends || loadingRankings ? (
            <p>Loading friends...</p>
          ) : friendRankings.length === 0 ? (
            <p className="text-sm text-gray-600">No friends have a matching ranking yet.</p>
          ) : (
            friendRankings.map((r) =>
              renderFriendRankingCard(r, () => setSelectedFriendRanking(r), selectedFriendRanking?.id === r.id)
            )
          )}
        </div>
      </div>

      {/* Side-by-side comparison */}
      {selectedMyRanking && selectedFriendRanking && myFull && friendFull && (
        <div className="max-w-6xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border p-4 rounded-lg bg-gray-50">
            <RankingView ranking={myFull.ranking} items={myFull.items} isOwner={true} />
          </div>
          <div className="border p-4 rounded-lg bg-gray-50">
            <RankingView ranking={friendFull.ranking} items={friendFull.items} />
          </div>
        </div>
      )}
    </main>
  )
}
