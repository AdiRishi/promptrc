CREATE TABLE IF NOT EXISTS prompt_shares (
  id TEXT NOT NULL PRIMARY KEY,
  ext_user_id TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_shares_active_prompt
ON prompt_shares (ext_user_id, prompt_id)
WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_prompt_shares_public_active
ON prompt_shares (id, revoked_at);
