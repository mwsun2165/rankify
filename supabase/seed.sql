-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.albums (
  id text NOT NULL,
  name text NOT NULL,
  artist_id text,
  image_url text,
  release_date date,
  total_tracks integer,
  spotify_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT albums_pkey PRIMARY KEY (id),
  CONSTRAINT albums_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artists(id)
);
CREATE TABLE public.artists (
  id text NOT NULL,
  name text NOT NULL,
  image_url text,
  genres ARRAY,
  popularity integer,
  spotify_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT artists_pkey PRIMARY KEY (id)
);
CREATE TABLE public.follows (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT follows_pkey PRIMARY KEY (id),
  CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id),
  CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.friend_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  requester_id uuid NOT NULL,
  target_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT friend_requests_pkey PRIMARY KEY (id),
  CONSTRAINT friend_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id),
  CONSTRAINT friend_requests_target_id_fkey FOREIGN KEY (target_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['friend_request'::text, 'ranking_like'::text])),
  data jsonb NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  spotify_id text UNIQUE,
  spotify_display_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  friend_code text NOT NULL UNIQUE,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.ranking_comments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  ranking_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ranking_comments_pkey PRIMARY KEY (id),
  CONSTRAINT ranking_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT ranking_comments_ranking_id_fkey FOREIGN KEY (ranking_id) REFERENCES public.rankings(id)
);
CREATE TABLE public.ranking_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  ranking_id uuid NOT NULL,
  item_id text NOT NULL,
  position integer NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ranking_items_pkey PRIMARY KEY (id),
  CONSTRAINT ranking_items_ranking_id_fkey FOREIGN KEY (ranking_id) REFERENCES public.rankings(id)
);
CREATE TABLE public.ranking_likes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  ranking_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ranking_likes_pkey PRIMARY KEY (id),
  CONSTRAINT ranking_likes_ranking_id_fkey FOREIGN KEY (ranking_id) REFERENCES public.rankings(id),
  CONSTRAINT ranking_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.rankings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  ranking_type text NOT NULL CHECK (ranking_type = ANY (ARRAY['albums'::text, 'artists'::text, 'songs'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  visibility text NOT NULL DEFAULT 'public'::text CHECK (visibility = ANY (ARRAY['public'::text, 'friends'::text, 'private'::text])),
  pool_item_ids ARRAY DEFAULT '{}'::text[],
  source_type text CHECK (source_type = ANY (ARRAY['artist'::text, 'album'::text])),
  source_id text,
  source_variant integer NOT NULL DEFAULT 1,
  CONSTRAINT rankings_pkey PRIMARY KEY (id),
  CONSTRAINT rankings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.tracks (
  id text NOT NULL,
  name text NOT NULL,
  album_id text,
  artist_ids ARRAY NOT NULL,
  duration_ms integer,
  track_number integer,
  image_url text,
  spotify_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tracks_pkey PRIMARY KEY (id),
  CONSTRAINT tracks_album_id_fkey FOREIGN KEY (album_id) REFERENCES public.albums(id)
);