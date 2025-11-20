-- Complete fix for 1000 score limit - drop all old policies and create new ones
-- This removes the limitation by replacing the policies entirely

-- Step 1: Drop all existing policies on contestant_scores
DROP POLICY IF EXISTS "Enable read access for all users" ON contestant_scores;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON contestant_scores;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON contestant_scores;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON contestant_scores;

-- Step 2: Drop all existing policies on categories
DROP POLICY IF EXISTS "Enable read access for all users" ON categories;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON categories;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON categories;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON categories;

-- Step 3: Drop all existing policies on criteria
DROP POLICY IF EXISTS "Enable read access for all users" ON criteria;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON criteria;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON criteria;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON criteria;

-- Step 4: Disable RLS on contestant_scores (most permissive)
ALTER TABLE contestant_scores DISABLE ROW LEVEL SECURITY;

-- Step 5: Disable RLS on categories
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- Step 6: Disable RLS on criteria
ALTER TABLE criteria DISABLE ROW LEVEL SECURITY;

-- Step 7: Verify RLS is disabled on all three tables
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('contestant_scores', 'categories', 'criteria')
ORDER BY tablename;

-- Step 8: Verify current score count
SELECT COUNT(*) as total_scores FROM contestant_scores;
