-- 004_permitir_repetidas.sql — permite a mesma mídia mais de uma vez
-- na mesma playlist (ex.: um aviso no começo e no fim da programação).
-- SQLite não tem "remover regra": recriamos a tabela sem a restrição
-- UNIQUE, preservando todos os itens já cadastrados (ids e ordem).
CREATE TABLE playlist_items_nova (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id      INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  media_id         INTEGER NOT NULL REFERENCES media(id)      ON DELETE CASCADE,
  position         INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER
);
INSERT INTO playlist_items_nova (id, playlist_id, media_id, position, duration_seconds)
  SELECT id, playlist_id, media_id, position, duration_seconds FROM playlist_items;
DROP TABLE playlist_items;
ALTER TABLE playlist_items_nova RENAME TO playlist_items;