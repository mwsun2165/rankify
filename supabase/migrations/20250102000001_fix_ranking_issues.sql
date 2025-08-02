-- Fix ranking issues: add songs type and auto-create profiles

-- 1. Update ranking_type constraint to include 'songs'
ALTER TABLE public.rankings 
DROP CONSTRAINT IF EXISTS rankings_ranking_type_check;

ALTER TABLE public.rankings 
ADD CONSTRAINT rankings_ranking_type_check 
CHECK (ranking_type IN ('albums', 'artists', 'songs'));

-- 2. Create function to automatically create user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url, spotify_id, spotify_display_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'preferred_username',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'provider_id',
    NEW.raw_user_meta_data->>'name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger to run the function when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Create profiles for any existing users that don't have them
INSERT INTO public.profiles (id, username, display_name, avatar_url, spotify_id, spotify_display_name)
SELECT 
  au.id,
  au.raw_user_meta_data->>'preferred_username',
  au.raw_user_meta_data->>'full_name',
  au.raw_user_meta_data->>'avatar_url',
  au.raw_user_meta_data->>'provider_id',
  au.raw_user_meta_data->>'name'
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;