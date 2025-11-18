-- Add judge_allocation column to categories table
-- This allows setting a specific judge count override for individual categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS judge_allocation INTEGER CHECK (judge_allocation > 0);

-- Add round_id column if not exists (for round-to-category mapping)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS round_id UUID REFERENCES rounds(id) ON DELETE CASCADE;

-- Create index for round_id for faster queries
CREATE INDEX IF NOT EXISTS idx_categories_round ON categories(round_id);

-- Add comment explaining the judge_allocation field
COMMENT ON COLUMN categories.judge_allocation IS 'Override judge count for this specific category. If set, this value is used instead of the round-level judge_target.';
COMMENT ON COLUMN categories.round_id IS 'The round this category belongs to. Categories can be assigned to specific rounds.';
