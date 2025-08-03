import { SearchInterface } from '@/components/search-interface'

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Search Interface */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <SearchInterface showRankingButtons={true} />
      </div>
    </main>
  )
}
