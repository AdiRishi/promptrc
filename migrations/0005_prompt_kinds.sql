-- Prompt kinds, pinning, marginal notes, and benchmark run logs.
-- Every column has a default so existing rows read back as plain, unpinned Prompts.
ALTER TABLE prompts
ADD COLUMN kind TEXT NOT NULL DEFAULT 'prompt';

ALTER TABLE prompts
ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;

ALTER TABLE prompts
ADD COLUMN notes TEXT NOT NULL DEFAULT '';

ALTER TABLE prompts
ADD COLUMN runs_json TEXT NOT NULL DEFAULT '[]';
