-- ============================================================
-- 001_init.sql — tabelas do Mural (versão 1 do esquema)
-- ============================================================

-- Usuários da equipe. Papéis: 'master' (mestre) e 'admin'.
CREATE TABLE users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  login      TEXT NOT NULL UNIQUE,       -- guardado em minúsculas
  pass_hash  TEXT NOT NULL,              -- formato: salt:hash (scrypt)
  role       TEXT NOT NULL CHECK(role IN ('master','admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- TVs cadastradas. O token vira a URL única do player.
CREATE TABLE devices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  location    TEXT NOT NULL DEFAULT '',
  orientation TEXT NOT NULL DEFAULT 'horizontal' CHECK(orientation IN ('horizontal','vertical')),
  notes       TEXT NOT NULL DEFAULT '',
  token       TEXT NOT NULL UNIQUE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Biblioteca de mídias: imagens, vídeos e avisos de texto.
CREATE TABLE media (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  kind             TEXT NOT NULL CHECK(kind IN ('image','video','text')),
  name             TEXT NOT NULL,
  file_path        TEXT,                 -- '/uploads/arquivo' (imagem/vídeo)
  mime             TEXT,
  size_bytes       INTEGER,
  title            TEXT,                 -- aviso de texto
  body             TEXT,                 -- aviso de texto
  bg_color         TEXT DEFAULT '#14634A',
  duration_seconds INTEGER NOT NULL DEFAULT 10,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE playlists (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  version    INTEGER NOT NULL DEFAULT 1, -- sobe a cada edição: a TV percebe e se atualiza
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE playlist_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id      INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  media_id         INTEGER NOT NULL REFERENCES media(id)      ON DELETE CASCADE,
  position         INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,               -- NULL = usa a duração padrão da mídia
  UNIQUE (playlist_id, media_id)
);

-- Playlist padrão de cada TV (fica o histórico; vale a mais recente).
CREATE TABLE device_assignments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   INTEGER NOT NULL REFERENCES devices(id)   ON DELETE CASCADE,
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  set_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Fila de playlists que devem tocar DEPOIS da atual.
CREATE TABLE play_queue (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   INTEGER NOT NULL REFERENCES devices(id)   ON DELETE CASCADE,
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL DEFAULT 0,
  added_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Último sinal de vida de cada TV + o que ela diz estar exibindo.
CREATE TABLE device_heartbeats (
  device_id           INTEGER PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
  last_seen           TEXT NOT NULL,
  current_media_id    INTEGER,
  current_playlist_id INTEGER,
  paused              INTEGER NOT NULL DEFAULT 0
);

-- Comandos curtos (pular, pausar...) entregues no próximo contato da TV.
CREATE TABLE device_commands (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id    INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,   -- play | skip | pause | resume | back
  payload      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  delivered_at TEXT
);