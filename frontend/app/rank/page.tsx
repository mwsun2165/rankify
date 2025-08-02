import { RankingBuilder } from '@/components/ranking-builder'

export default function RankPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold">Create Ranking</h1>
            <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
              ← Back
            </a>
          </div>
        </div>
      </header>

      {/* Ranking Builder */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <RankingBuilder />
      </div>
    </main>
  )
}