-- Adds judge allocation and progression metadata columns to the rounds table
-- Run this in your Supabase SQL editor or migration pipeline before using the updated Competition Editor.

-- Ensure the rounds table exists. If it does not, create it with the required columns first.

ALTER TABLE rounds
    ADD COLUMN IF NOT EXISTS order_index INTEGER,
    ADD COLUMN IF NOT EXISTS judge_target INTEGER,
    ADD COLUMN IF NOT EXISTS max_per_gender INTEGER,
    ADD COLUMN IF NOT EXISTS advance_per_gender INTEGER,
    ADD COLUMN IF NOT EXISTS highlight_per_gender INTEGER;

-- Optional legacy aliases that the scoring utilities can read if you have older data.
ALTER TABLE rounds
    ADD COLUMN IF NOT EXISTS participants_per_gender INTEGER,
    ADD COLUMN IF NOT EXISTS advance_participants INTEGER,
    ADD COLUMN IF NOT EXISTS highlight_participants INTEGER;
