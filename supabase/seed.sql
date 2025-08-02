-- Seed data for development and testing

-- Sample artists (using real Spotify IDs for testing)
INSERT INTO public.artists (id, name, image_url, genres, popularity, spotify_url) VALUES
('4Z8W4fKeB5YxbusRsdQVPb', 'Radiohead', 'https://i.scdn.co/image/ab6761610000e5eba03696716c9ee605006047fd', ARRAY['alternative rock', 'art rock', 'melancholia', 'oxford indie', 'permanent wave', 'rock'], 95, 'https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb'),
('3WrFJ7ztbogyGnTHbHJFl2', 'The Beatles', 'https://i.scdn.co/image/ab6761610000e5ebe9348cc01ff5d55971bf39ed', ARRAY['british invasion', 'classic rock', 'merseybeat', 'psychedelic rock', 'rock'], 92, 'https://open.spotify.com/artist/3WrFJ7ztbogyGnTHbHJFl2'),
('06HL4z0CvFAxyc27GXpf02', 'Taylor Swift', 'https://i.scdn.co/image/ab6761610000e5eb859e4c14fa59296c8649e0e4', ARRAY['pop', 'singer-songwriter'], 100, 'https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02'),
('1dfeR4HaWDbWqFHLkxsg1d', 'Queen', 'https://i.scdn.co/image/ab6761610000e5eb40b5c07ab77b6b1a9075fdc0', ARRAY['classic rock', 'glam rock', 'rock'], 91, 'https://open.spotify.com/artist/1dfeR4HaWDbWqFHLkxsg1d');

-- Sample albums
INSERT INTO public.albums (id, name, artist_id, image_url, release_date, total_tracks, spotify_url) VALUES
('6dVIqQ8qmQ5GBnJ9shOYGE', 'OK Computer', '4Z8W4fKeB5YxbusRsdQVPb', 'https://i.scdn.co/image/ab67616d0000b273c8b444df094279e70d0ed856', '1997-06-16', 12, 'https://open.spotify.com/album/6dVIqQ8qmQ5GBnJ9shOYGE'),
('7ycBtnsMtyVbbwTfJwRjSP', 'In Rainbows', '4Z8W4fKeB5YxbusRsdQVPb', 'https://i.scdn.co/image/ab67616d0000b273f2e2c166174c2b82e853c0b8', '2007-10-10', 10, 'https://open.spotify.com/album/7ycBtnsMtyVbbwTfJwRjSP'),
('0PT5m6hwPRrpBwIHVnvbFX', 'Abbey Road', '3WrFJ7ztbogyGnTHbHJFl2', 'https://i.scdn.co/image/ab67616d0000b273dc30583ba717007b00cceb25', '1969-09-26', 17, 'https://open.spotify.com/album/0PT5m6hwPRrpBwIHVnvbFX'),
('7gsWAHLeT0w7es6FofOXk1', 'Sgt. Pepper''s Lonely Hearts Club Band', '3WrFJ7ztbogyGnTHbHJFl2', 'https://i.scdn.co/image/ab67616d0000b273d0ec2db731952b7efabc6397', '1967-06-01', 13, 'https://open.spotify.com/album/7gsWAHLeT0w7es6FofOXk1'),
('5AEDGbliTTfjOB8TSm1sxt', 'folklore', '06HL4z0CvFAxyc27GXpf02', 'https://i.scdn.co/image/ab67616d0000b273395b9e0da9d54c0f9e3b8cf6', '2020-07-24', 16, 'https://open.spotify.com/album/5AEDGbliTTfjOB8TSm1sxt'),
('4hDok0OAJd57SGIT8xuWJH', 'A Night at the Opera', '1dfeR4HaWDbWqFHLkxsg1d', 'https://i.scdn.co/image/ab67616d0000b273ce4f1737bc8a646c8c4bd25a', '1975-11-21', 12, 'https://open.spotify.com/album/4hDok0OAJd57SGIT8xuWJH');

-- Note: Sample user profiles and rankings would be created after users sign up via Spotify OAuth
-- This seed data provides the basic artist/album catalog for testing