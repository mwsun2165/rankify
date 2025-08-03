-- Create tracks table to store song metadata
create table if not exists public.tracks (
    id text primary key,
    name text not null,
    album_id text references public.albums(id) on delete cascade,
    artist_ids text[] not null,
    duration_ms integer,
    track_number integer,
    image_url text,
    spotify_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Index for fast lookup by album
create index if not exists tracks_album_id_idx on public.tracks(album_id);
