import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getFullRanking } from '@/lib/get-full-ranking'
import { RankingView } from '@/components/ranking-view'

interface BrowseRankingPageProps {
  params: { id: string }
}

export default async function BrowseRankingPage({
  params,
}: BrowseRankingPageProps) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const full = await getFullRanking(params.id, user?.id)

  if (!full) return notFound()

  const isOwner = user?.id === (full.ranking as any).user_id

  return (
    <main className="min-h-screen bg-white py-8 px-4">
      <RankingView
        ranking={full.ranking}
        items={full.items}
        isOwner={isOwner}
      />
    </main>
  )
}
