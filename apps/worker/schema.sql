CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  author TEXT NOT NULL CHECK (author IN ('HER', 'HIM')),
  created_at TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  image_url TEXT,
  image_urls TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_updated_at ON memories(updated_at DESC);

CREATE TABLE IF NOT EXISTS presence (
  instance_id TEXT PRIMARY KEY,
  user_type TEXT NOT NULL CHECK (user_type IN ('HER', 'HIM')),
  online_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_presence_online_at ON presence(online_at DESC);
