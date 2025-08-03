'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import type { ItemMeta } from '@/lib/get-full-ranking'

interface RankingViewProps {
  ranking: any // Server-side fetched ranking row together with profile + items
  items: ItemMeta[]
  isOwner?: boolean
}

export function RankingView({ ranking, items, isOwner = false }: RankingViewProps) {
  const router = useRouter()
  const supabase = createClientSupabaseClient()
  const [copied, setCopied] = useState(false)
  const [visibility, setVisibility] = useState<string>(ranking.visibility || 'public')
  const [processing, setProcessing] = useState(false)

  /* ---------------------------------- utils --------------------------------- */
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })

  const formatDuration = (ms?: number | null) => {
    if (!ms) return ''
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const exportText = () => {
    const lines: string[] = []
    lines.push(`# ${ranking.title}`)
    lines.push('')
    ranking.ranking_items
      .sort((a: any, b: any) => a.position - b.position)
      .forEach((ri: any) => {
        const meta = items.find((i) => i.id === ri.item_id)
        lines.push(`${ri.position}. ${meta?.name || ri.item_id}`)
      })
    return lines.join('\n')
  }

  /* ---------------------------- owner interactions --------------------------- */
  const handleVisibilityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVisibility = e.target.value
    setVisibility(newVisibility)

    setProcessing(true)
    const { error } = await supabase
      .from('rankings')
      .update({ visibility: newVisibility })
      .eq('id', ranking.id)
    if (error) console.error(error)
    setProcessing(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this ranking? This action cannot be undone.')) return

    setProcessing(true)
    const { error } = await supabase
      .from('rankings')
      .delete()
      .eq('id', ranking.id)
    if (error) {
      console.error(error)
      setProcessing(false)
      return
    }
    router.push('/browse')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  /* ---------------------------------- render --------------------------------- */
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{ranking.title}</h1>
          <p className="text-sm text-gray-500">
            by {ranking.profiles?.display_name || ranking.profiles?.username || 'Anonymous'} ·{' '}
            {formatDate(ranking.created_at)}
          </p>
        </div>



        {/* Export button */}
        <button
          onClick={handleCopy}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          {copied ? 'Copied!' : 'Export'}
        </button>
      </div>

      {/* Ordered list */}
      <ol className="space-y-2">
        {ranking.ranking_items
          .sort((a: any, b: any) => a.position - b.position)
          .map((ri: any) => {
            const meta = items.find((i) => i.id === ri.item_id)
            if (!meta) return null
            const isArtist = ranking.ranking_type === 'artists'
            const showThumb = ranking.ranking_type !== 'songs'
            const thumbClasses = isArtist ? 'rounded-full' : 'rounded'
            return (
              <li key={ri.item_id} className="flex items-center gap-3 p-3 border rounded bg-gray-50">
                {/* Position number */}
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                  {ri.position}
                </div>

                {/* Thumbnail for artists/albums */}
                {showThumb && (
                  meta.image_url ? (
                    <img
                      src={meta.image_url}
                      alt={meta.name}
                      className={`h-12 w-12 object-cover ${thumbClasses}`}
                    />
                  ) : (
                    <div className={`h-12 w-12 bg-gray-200 flex-shrink-0 ${thumbClasses}`}></div>
                  )
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{meta.name}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {ranking.ranking_type === 'albums' && meta.artist_name}
                    {ranking.ranking_type === 'songs' && formatDuration(meta.duration_ms)}
                  </p>
                </div>
              </li>
            )
          })}
      </ol>
    </div>
  )
}
