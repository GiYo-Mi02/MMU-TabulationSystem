-- Migration Guide for Existing Contestants
-- Run this ONLY if you have existing contestants without the 'sex' field populated

-- Step 1: Check if sex column exists and has data
SELECT id, name, number, sex FROM contestants;

-- Step 2: If sex column is NULL for existing records, update them manually
-- Example: Update existing contestants to Male (adjust as needed)
UPDATE contestants 
SET sex = 'Male' 
WHERE sex IS NULL AND number <= 10;

UPDATE contestants 
SET sex = 'Female' 
WHERE sex IS NULL AND number > 10;

-- OR update them one by one:
-- UPDATE contestants SET sex = 'Male' WHERE id = 'contestant-id-here';

-- Step 3: Verify the update
SELECT id, name, number, sex FROM contestants ORDER BY sex, number;

-- Step 4: (Optional) If you want to reset contestant numbers by gender
-- This keeps the same contestants but renumbers them starting from 1 for each gender

-- First, backup your data!
-- Then you can manually update numbers if needed:
-- UPDATE contestants SET number = 1 WHERE id = 'some-id' AND sex = 'Male';
-- UPDATE contestants SET number = 2 WHERE id = 'some-id' AND sex = 'Male';
-- etc.

-- IMPORTANT NOTES:
-- 1. The system now allows same numbers for different genders
--    Example: Male #1 and Female #1 are both valid
-- 
-- 2. If you have existing contestants with duplicate numbers,
--    you need to either:
--    a) Assign them different genders (Male/Female)
--    b) Renumber them within their gender group
--
-- 3. After migration, you can add new contestants through the UI
--    The system will prevent duplicate number + gender combinations

-- Verification Query:
-- Check for any duplicate number + sex combinations
SELECT number, sex, COUNT(*) as count
FROM contestants
GROUP BY number, sex
HAVING COUNT(*) > 1;

-- If the query above returns any rows, you have duplicates that need fixing!
