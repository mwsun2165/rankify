import { SearchInterface } from '@/components/search-interface'

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold">Search Music</h1>
            <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
              ← Back
            </a>
          </div>
        </div>
      </header>

      {/* Search Interface */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <SearchInterface showRankingButtons={true} />
      </div>
    </main>
  )
}