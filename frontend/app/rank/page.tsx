import { RankingBuilder } from '@/components/ranking-builder'

export default function RankPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Ranking Builder */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <RankingBuilder />
      </div>
    </main>
  )
}
