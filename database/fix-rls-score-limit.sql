-- Fix the 1000 score limit issue by disabling RLS completely
-- ⚠️ SAFE: Only affects permissions, no data is deleted

-- Step 1: DISABLE RLS entirely (no policies = no limits)
ALTER TABLE contestant_scores DISABLE ROW LEVEL SECURITY;

-- Step 2: Check current row level security status
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename = 'contestant_scores';

-- Step 3: Verify current row count
SELECT COUNT(*) as total_scores FROM contestant_scores;

-- Step 4: Check table constraints
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'contestant_scores';
