-- 005_playlist_oculta.sql — playlists criadas automaticamente pelo
-- "Exibir na TV" da biblioteca ficam ocultas da interface.
ALTER TABLE playlists ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;