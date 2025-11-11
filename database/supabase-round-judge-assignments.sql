-- Assign specific judges to each competition round
-- Run this migration in Supabase to enable per-round judge configuration.

CREATE TABLE IF NOT EXISTS round_judges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    judge_id UUID NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(round_id, judge_id)
);

CREATE INDEX IF NOT EXISTS idx_round_judges_round ON round_judges(round_id);
CREATE INDEX IF NOT EXISTS idx_round_judges_judge ON round_judges(judge_id);
