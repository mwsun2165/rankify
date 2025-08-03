-- Friend system: friend codes, friend requests, and notifications

-- 1. Add friend_code column to profiles
ALTER TABLE public.profiles 
ADD COLUMN friend_code TEXT UNIQUE;

-- Generate friend codes for existing users
UPDATE public.profiles 
SET friend_code = UPPER(substr(md5(gen_random_uuid()::text), 1, 8))
WHERE friend_code IS NULL;

-- Make friend_code NOT NULL after populating existing records
ALTER TABLE public.profiles 
ALTER COLUMN friend_code SET NOT NULL;

-- Function to generate friend code for new users
CREATE OR REPLACE FUNCTION public.generate_friend_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := UPPER(substr(md5(gen_random_uuid()::text), 1, 8));
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE friend_code = new_code) INTO code_exists;
        IF NOT code_exists THEN
            EXIT;
        END IF;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Update the handle_new_user function to include friend_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url, spotify_id, spotify_display_name, friend_code)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'preferred_username',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'provider_id',
    NEW.raw_user_meta_data->>'name',
    public.generate_friend_code()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create friend_requests table
CREATE TABLE public.friend_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    target_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Prevent duplicate requests and self-requests
    UNIQUE(requester_id, target_id),
    CHECK (requester_id != target_id)
);

-- 3. Create notifications table
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('friend_request', 'ranking_like')),
    data JSONB NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. Create function to handle friend request notifications
CREATE OR REPLACE FUNCTION public.handle_friend_request_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create notification for pending requests
    IF NEW.status = 'pending' THEN
        INSERT INTO public.notifications (user_id, type, data)
        VALUES (
            NEW.target_id,
            'friend_request',
            jsonb_build_object(
                'friend_request_id', NEW.id,
                'requester_id', NEW.requester_id,
                'requester_name', (
                    SELECT COALESCE(display_name, username, 'Unknown User')
                    FROM public.profiles 
                    WHERE id = NEW.requester_id
                )
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to handle ranking like notifications
CREATE OR REPLACE FUNCTION public.handle_ranking_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    ranking_owner_id UUID;
    ranking_title TEXT;
    liker_name TEXT;
BEGIN
    -- Get ranking owner and title
    SELECT r.user_id, r.title
    INTO ranking_owner_id, ranking_title
    FROM public.rankings r
    WHERE r.id = NEW.ranking_id;
    
    -- Only notify if someone else liked your ranking
    IF ranking_owner_id != NEW.user_id THEN
        -- Get liker's name
        SELECT COALESCE(display_name, username, 'Unknown User')
        INTO liker_name
        FROM public.profiles
        WHERE id = NEW.user_id;
        
        INSERT INTO public.notifications (user_id, type, data)
        VALUES (
            ranking_owner_id,
            'ranking_like',
            jsonb_build_object(
                'ranking_id', NEW.ranking_id,
                'ranking_title', ranking_title,
                'liker_id', NEW.user_id,
                'liker_name', liker_name
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create triggers
CREATE TRIGGER handle_friend_request_notification
    AFTER INSERT ON public.friend_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_friend_request_notification();

CREATE TRIGGER handle_ranking_like_notification
    AFTER INSERT ON public.ranking_likes
    FOR EACH ROW EXECUTE FUNCTION public.handle_ranking_like_notification();

-- Add updated_at trigger for friend_requests
CREATE TRIGGER handle_friend_requests_updated_at
    BEFORE UPDATE ON public.friend_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. Create indexes for performance
CREATE INDEX idx_profiles_friend_code ON public.profiles(friend_code);
CREATE INDEX idx_friend_requests_requester ON public.friend_requests(requester_id);
CREATE INDEX idx_friend_requests_target ON public.friend_requests(target_id);
CREATE INDEX idx_friend_requests_status ON public.friend_requests(status);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- 8. Enable RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for friend_requests
CREATE POLICY "Users can view friend requests involving them" ON public.friend_requests
    FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = target_id);

CREATE POLICY "Users can create friend requests" ON public.friend_requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friend requests they received" ON public.friend_requests
    FOR UPDATE USING (auth.uid() = target_id);

-- 10. RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- 11. Create helpful functions for the frontend

-- Function to get friend count (mutual follows)
CREATE OR REPLACE FUNCTION public.get_friend_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.follows f1
        JOIN public.follows f2 ON f1.follower_id = user_uuid
            AND f1.following_id = f2.follower_id
            AND f2.following_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total likes on user's public rankings
CREATE OR REPLACE FUNCTION public.get_user_ranking_likes(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.ranking_likes rl
        JOIN public.rankings r ON rl.ranking_id = r.id
        WHERE r.user_id = user_uuid AND r.is_public = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.notifications
        WHERE user_id = user_uuid AND is_read = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;