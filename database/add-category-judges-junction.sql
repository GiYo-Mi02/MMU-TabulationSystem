-- Create junction table for category-specific judge assignments
-- This allows judges to be assigned to specific categories within their rounds

CREATE TABLE IF NOT EXISTS category_judges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    judge_id UUID NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category_id, judge_id)
);

CREATE INDEX IF NOT EXISTS idx_category_judges_category ON category_judges(category_id);
CREATE INDEX IF NOT EXISTS idx_category_judges_judge ON category_judges(judge_id);
