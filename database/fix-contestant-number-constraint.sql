-- Fix: Allow same contestant number for different genders
-- This removes the unique constraint on 'number' alone
-- and adds a composite unique constraint on (number, sex)

-- Step 1: Drop the old unique constraint on number
ALTER TABLE contestants
  DROP CONSTRAINT IF EXISTS contestants_number_key;

-- Step 2: Add new composite unique constraint for (number, sex)
-- This allows Male #1 and Female #1 to exist simultaneously
ALTER TABLE contestants
  ADD CONSTRAINT contestants_number_sex_unique 
  UNIQUE (number, sex);

-- Step 3: Verify the constraint was added
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'contestants'::regclass;

-- Now you can have:
-- ✅ Male #1, Male #2, Male #3...
-- ✅ Female #1, Female #2, Female #3...
-- ❌ Two Male #1 (will be rejected)
-- ❌ Two Female #1 (will be rejected)
