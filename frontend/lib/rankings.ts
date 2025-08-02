import { createClientSupabaseClient } from '@/lib/supabase-client'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { RankingInsert, RankingItemInsert, Ranking } from '@rankify/db-types'
import type { RankableItem } from '@/components/ranking-builder'

export interface SaveRankingData {
  title: string
  description?: string
  ranking_type: 'albums' | 'songs' | 'artists'
  is_public: boolean
  items: RankableItem[]
}

export async function saveRanking(data: SaveRankingData, userId: string): Promise<string> {
  const supabase = createClientSupabaseClient()

  try {
    // First, ensure user profile exists
    await ensureUserProfileExists(userId)
    
    // Then, ensure artists and albums exist in our database
    await ensureSpotifyDataExists(data.items)

    // Map ranking type to match database constraint
    const dbRankingType = data.ranking_type === 'songs' ? 'albums' : data.ranking_type

    // Create the ranking
    const rankingData: RankingInsert = {
      user_id: userId,
      title: data.title,
      description: data.description,
      ranking_type: dbRankingType, // Use mapped type
      is_public: data.is_public
    }

    const { data: ranking, error: rankingError } = await supabase
      .from('rankings')
      .insert(rankingData)
      .select('id')
      .single()

    if (rankingError) {
      console.error('Ranking insert error:', rankingError)
      throw rankingError
    }

    // Create ranking items
    const rankingItems: RankingItemInsert[] = data.items.map((item, index) => ({
      ranking_id: ranking.id,
      item_id: item.id,
      position: index + 1,
      notes: null
    }))

    const { error: itemsError } = await supabase
      .from('ranking_items')
      .insert(rankingItems)

    if (itemsError) {
      console.error('Ranking items insert error:', itemsError)
      throw itemsError
    }

    return ranking.id
  } catch (error) {
    console.error('Error saving ranking:', error)
    throw error
  }
}

async function ensureUserProfileExists(userId: string): Promise<void> {
  const supabase = createClientSupabaseClient()

  try {
    // Check if profile exists
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (fetchError && fetchError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            username: user.user_metadata?.preferred_username || null,
            display_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
            spotify_id: user.user_metadata?.provider_id || null,
            spotify_display_name: user.user_metadata?.name || null
          })

        if (insertError) {
          console.warn('Failed to create user profile:', insertError)
        }
      }
    }
  } catch (error) {
    console.warn('Error ensuring user profile exists:', error)
  }
}

async function ensureSpotifyDataExists(items: RankableItem[]): Promise<void> {
  const supabase = createClientSupabaseClient()

  // Extract unique artists and albums
  const artists = new Map<string, any>()
  const albums = new Map<string, any>()

  items.forEach(item => {
    if ('artists' in item && 'total_tracks' in item) {
      // This is an album
      albums.set(item.id, {
        id: item.id,
        name: item.name,
        artist_id: item.artists[0].id,
        image_url: item.images?.[0]?.url || null,
        release_date: item.release_date || null,
        total_tracks: item.total_tracks,
        spotify_url: item.external_urls.spotify
      })
      
      // Add the album's artists
      item.artists.forEach(artist => {
        artists.set(artist.id, {
          id: artist.id,
          name: artist.name,
          image_url: null,
          genres: [],
          popularity: null,
          spotify_url: artist.external_urls?.spotify || null
        })
      })
    } else if ('duration_ms' in item) {
      // This is a track - add its artists and album
      item.artists.forEach(artist => {
        artists.set(artist.id, {
          id: artist.id,
          name: artist.name,
          image_url: null,
          genres: [],
          popularity: null,
          spotify_url: artist.external_urls?.spotify || null
        })
      })

      if (item.album) {
        albums.set(item.album.id, {
          id: item.album.id,
          name: item.album.name,
          artist_id: item.album.artists[0].id,
          image_url: item.album.images?.[0]?.url || null,
          release_date: item.album.release_date || null,
          total_tracks: item.album.total_tracks,
          spotify_url: item.album.external_urls.spotify
        })
      }
    } else if ('genres' in item) {
      // This is an artist
      artists.set(item.id, {
        id: item.id,
        name: item.name,
        image_url: item.images?.[0]?.url || null,
        genres: item.genres || [],
        popularity: item.followers?.total || null,
        spotify_url: item.external_urls.spotify
      })
    }
  })

  // Insert artists (ignore conflicts)
  if (artists.size > 0) {
    const { error: artistError } = await supabase
      .from('artists')
      .upsert(Array.from(artists.values()), { onConflict: 'id' })

    if (artistError) {
      console.warn('Error upserting artists:', artistError)
    }
  }

  // Insert albums (ignore conflicts)
  if (albums.size > 0) {
    const { error: albumError } = await supabase
      .from('albums')
      .upsert(Array.from(albums.values()), { onConflict: 'id' })

    if (albumError) {
      console.warn('Error upserting albums:', albumError)
    }
  }
}

export async function getUserRankings(userId: string): Promise<Ranking[]> {
  const supabase = createClientSupabaseClient()

  const { data, error } = await supabase
    .from('rankings')
    .select(`
      *,
      ranking_items(count)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getPublicRankings(): Promise<Ranking[]> {
  const supabase = createClientSupabaseClient()

  const { data, error } = await supabase
    .from('rankings')
    .select(`
      *,
      profiles(username, display_name),
      ranking_items(count),
      ranking_likes(count)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error
  return data || []
}

export async function getRankingDetails(rankingId: string) {
  const supabase = createClientSupabaseClient()

  const { data, error } = await supabase
    .from('rankings')
    .select(`
      *,
      profiles(username, display_name, avatar_url),
      ranking_items(
        position,
        item_id,
        notes
      ),
      ranking_likes(count),
      ranking_comments(
        id,
        content,
        created_at,
        profiles(username, display_name, avatar_url)
      )
    `)
    .eq('id', rankingId)
    .single()

  if (error) throw error
  return data
}