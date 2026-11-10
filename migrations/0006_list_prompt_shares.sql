-- A share link is unlisted by default: only people with the link reach it.
-- `listed_at` is set when its owner publishes it, which puts it in the public
-- list and lets search engines index it.
ALTER TABLE prompt_shares ADD COLUMN listed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_prompt_shares_listed
ON prompt_shares (listed_at)
WHERE listed_at IS NOT NULL AND revoked_at IS NULL;
