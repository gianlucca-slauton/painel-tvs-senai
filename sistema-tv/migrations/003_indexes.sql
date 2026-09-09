-- 003_indexes.sql — índices para manter as buscas rápidas com muitas TVs
CREATE INDEX IF NOT EXISTS idx_commands_device   ON device_commands(device_id);
CREATE INDEX IF NOT EXISTS idx_queue_device      ON play_queue(device_id);
CREATE INDEX IF NOT EXISTS idx_assignments_dev   ON device_assignments(device_id);
CREATE INDEX IF NOT EXISTS idx_items_playlist    ON playlist_items(playlist_id);