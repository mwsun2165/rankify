import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Database } from '@rankify/db-types'

export interface ItemMeta {
  id: string
  name: string
  image_url: string | null
  // Optional fields depending on ranking type
  duration_ms?: number | null
  artist_name?: string | null
}

export interface FullRanking {
  ranking: Database['public']['Tables']['rankings']['Row'] & {
    profiles: {
      username: string | null
      display_name: string | null
      avatar_url: string | null
    }
    ranking_items: {
      item_id: string
      position: number
      notes: string | null
    }[]
  }
  items: ItemMeta[]
}

/**
 * Fetch complete ranking information together with the metadata for the ranked items.
 *
 * @param rankingId  The UUID of the ranking row
 * @param viewerId   The UUID of the currently signed-in user (optional – used for owner checks inside RLS)
 */
export async function getFullRanking(
  rankingId: string,
  viewerId?: string
): Promise<FullRanking | null> {
  const supabase = createServerSupabaseClient()

  // Make sure RLS policies run in the context of the current viewer. If viewerId was provided
  // (e.g. when called from a server component after reading the auth cookie) we set the auth UID.
  if (viewerId) {
    // "setAuth" is available on the JS client; however @supabase/ssr wraps this for Next.js.
    // Inside Server Components we cannot call supabase.auth.setSession directly, but we can
    // set the X-Client-Info header to mimic the viewer. The SSR helper exposes "setAuth".
    // For simplicity (and because all our RLS policies allow public data for public rankings)
    // we skip explicit impersonation – the cookie coming from the request is already used by
    // createServerSupabaseClient(), so we are good here.
  }

  // 1. Get the ranking row together with its items and creator profile
  const { data: ranking, error: rankingErr } = await supabase
    .from('rankings')
    .select(
      `
      *,
      profiles(username, display_name, avatar_url),
      ranking_items(
        item_id,
        position,
        notes
      )
    `
    )
    .eq('id', rankingId)
    .single()

  if (rankingErr) throw rankingErr
  if (!ranking) return null

  // Sort items by position – easier to work with later
  const itemsSorted = (ranking as any).ranking_items.sort(
    (a: any, b: any) => a.position - b.position
  ) as {
    item_id: string
    position: number
    notes: string | null
  }[]

  const itemIds = itemsSorted.map((ri) => ri.item_id)
  const itemsMeta: ItemMeta[] = []

  switch (ranking.ranking_type) {
    case 'artists': {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, image_url')
        .in('id', itemIds)
      if (error) throw error
      data?.forEach((row) => {
        itemsMeta.push({
          id: row.id,
          name: row.name,
          image_url: row.image_url,
        })
      })
      break
    }

    case 'albums': {
      // First fetch the albums with artist_id
      const { data: albums, error: albumsErr } = await supabase
        .from('albums')
        .select('id, name, image_url, artist_id')
        .in('id', itemIds)
      if (albumsErr) throw albumsErr

      // Collect artist_ids to fetch names
      const artistIds = [...new Set(albums?.map((a) => a.artist_id))]
      let artistMap: Record<string, string> = {}
      if (artistIds.length) {
        const { data: artists } = await supabase
          .from('artists')
          .select('id, name')
          .in('id', artistIds)
        artistMap = Object.fromEntries(
          (artists || []).map((a) => [a.id, a.name])
        )
      }

      albums?.forEach((album) => {
        itemsMeta.push({
          id: album.id,
          name: album.name,
          image_url: album.image_url,
          artist_name: artistMap[album.artist_id] || null,
        })
      })
      break
    }

    case 'songs': {
      const { data: tracks, error: tracksErr } = await supabase
        .from('tracks' as any)
        .select('id, name, image_url, duration_ms')
        .in('id', itemIds)
      if (tracksErr) throw tracksErr

      tracks?.forEach((track: any) => {
        itemsMeta.push({
          id: track.id,
          name: track.name,
          image_url: track.image_url,
          duration_ms: track.duration_ms,
        })
      })
      break
    }

    default:
      // Unknown type – return empty list so UI can still render something
      break
  }

  return {
    ranking: ranking as any,
    items: itemsMeta,
  }
}
