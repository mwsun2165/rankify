-- Initial database schema for Rankify music ranking app

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    spotify_id TEXT UNIQUE,
    spotify_display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Artists table (from Spotify API)
CREATE TABLE public.artists (
    id TEXT PRIMARY KEY, -- Spotify artist ID
    name TEXT NOT NULL,
    image_url TEXT,
    genres TEXT[], -- Array of genre strings
    popularity INTEGER, -- Spotify popularity score 0-100
    spotify_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Albums table (from Spotify API)
CREATE TABLE public.albums (
    id TEXT PRIMARY KEY, -- Spotify album ID
    name TEXT NOT NULL,
    artist_id TEXT REFERENCES public.artists(id) ON DELETE CASCADE,
    image_url TEXT,
    release_date DATE,
    total_tracks INTEGER,
    spotify_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- User rankings/lists
CREATE TABLE public.rankings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    ranking_type TEXT NOT NULL CHECK (ranking_type IN ('albums', 'artists')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Individual ranking items (the actual ranked items in a list)
CREATE TABLE public.ranking_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ranking_id UUID REFERENCES public.rankings(id) ON DELETE CASCADE NOT NULL,
    item_id TEXT NOT NULL, -- Either artist_id or album_id
    position INTEGER NOT NULL,
    notes TEXT, -- User's notes about this item
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure unique position within each ranking
    UNIQUE(ranking_id, position),
    -- Ensure item only appears once per ranking
    UNIQUE(ranking_id, item_id)
);

-- Follows/social connections
CREATE TABLE public.follows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Prevent self-follows and duplicate follows
    CHECK (follower_id != following_id),
    UNIQUE(follower_id, following_id)
);

-- Likes on rankings
CREATE TABLE public.ranking_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    ranking_id UUID REFERENCES public.rankings(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- One like per user per ranking
    UNIQUE(user_id, ranking_id)
);

-- Comments on rankings
CREATE TABLE public.ranking_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    ranking_id UUID REFERENCES public.rankings(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_spotify_id ON public.profiles(spotify_id);
CREATE INDEX idx_artists_name ON public.artists(name);
CREATE INDEX idx_albums_artist_id ON public.albums(artist_id);
CREATE INDEX idx_albums_name ON public.albums(name);
CREATE INDEX idx_rankings_user_id ON public.rankings(user_id);
CREATE INDEX idx_rankings_public ON public.rankings(is_public);
CREATE INDEX idx_rankings_type ON public.rankings(ranking_type);
CREATE INDEX idx_ranking_items_ranking_id ON public.ranking_items(ranking_id);
CREATE INDEX idx_ranking_items_position ON public.ranking_items(ranking_id, position);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_ranking_likes_ranking ON public.ranking_likes(ranking_id);
CREATE INDEX idx_ranking_comments_ranking ON public.ranking_comments(ranking_id);

-- Row Level Security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_comments ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, but only update their own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Rankings: Public rankings readable by all, private only by owner
CREATE POLICY "Public rankings are viewable by everyone" ON public.rankings
    FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can manage own rankings" ON public.rankings
    FOR ALL USING (auth.uid() = user_id);

-- Ranking items: Inherit permissions from parent ranking
CREATE POLICY "Ranking items viewable based on ranking visibility" ON public.ranking_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.rankings 
            WHERE rankings.id = ranking_items.ranking_id 
            AND (rankings.is_public = true OR rankings.user_id = auth.uid())
        )
    );
CREATE POLICY "Users can manage own ranking items" ON public.ranking_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.rankings 
            WHERE rankings.id = ranking_items.ranking_id 
            AND rankings.user_id = auth.uid()
        )
    );

-- Follows: Users can see all follows, but only manage their own
CREATE POLICY "Follows are viewable by everyone" ON public.follows
    FOR SELECT USING (true);
CREATE POLICY "Users can manage own follows" ON public.follows
    FOR ALL USING (auth.uid() = follower_id);

-- Ranking likes: Users can see all likes, but only manage their own
CREATE POLICY "Ranking likes are viewable by everyone" ON public.ranking_likes
    FOR SELECT USING (true);
CREATE POLICY "Users can manage own likes" ON public.ranking_likes
    FOR ALL USING (auth.uid() = user_id);

-- Ranking comments: Users can see comments on visible rankings, manage own comments
CREATE POLICY "Comments viewable on visible rankings" ON public.ranking_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.rankings 
            WHERE rankings.id = ranking_comments.ranking_id 
            AND (rankings.is_public = true OR rankings.user_id = auth.uid())
        )
    );
CREATE POLICY "Users can manage own comments" ON public.ranking_comments
    FOR ALL USING (auth.uid() = user_id);

-- Artists and albums are public data (no RLS needed)
-- They'll be populated from Spotify API and readable by everyone

-- Function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_artists_updated_at
    BEFORE UPDATE ON public.artists
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_albums_updated_at
    BEFORE UPDATE ON public.albums
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_rankings_updated_at
    BEFORE UPDATE ON public.rankings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_ranking_items_updated_at
    BEFORE UPDATE ON public.ranking_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_ranking_comments_updated_at
    BEFORE UPDATE ON public.ranking_comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();