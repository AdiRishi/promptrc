CREATE TABLE IF NOT EXISTS prompt_library_state (
  ext_user_id TEXT NOT NULL PRIMARY KEY,
  is_fresh INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
