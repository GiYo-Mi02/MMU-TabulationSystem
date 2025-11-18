-- Mock Data Seed Script for Testing Category-Specific Judge Assignments
-- Setup: 1 Round, 5 Categories, 9 Judges with specific category assignments
-- Run this in Supabase SQL Editor to populate test data

-- First, clear existing data (optional - comment out if you want to keep existing data)
-- DELETE FROM contestant_scores;
-- DELETE FROM category_judges;
-- DELETE FROM round_judges;
-- DELETE FROM criteria;
-- DELETE FROM categories;
-- DELETE FROM rounds;
-- DELETE FROM judges;
-- DELETE FROM contestants;

-- 1. Create Round
INSERT INTO rounds (name, order_index, judge_target, max_per_gender, advance_per_gender, highlight_per_gender)
VALUES (
  'Preliminary Competition',
  1,
  9,
  NULL,
  NULL,
  NULL
) ON CONFLICT DO NOTHING;

-- Get the round ID for use in categories
WITH round_data AS (
  SELECT id as round_id FROM rounds WHERE name = 'Preliminary Competition' LIMIT 1
)

-- 2. Create Categories
INSERT INTO categories (round_id, name, description, percentage, order_index)
SELECT 
  round_id,
  name,
  description,
  percentage,
  order_index
FROM (
  SELECT 1 as priority, 'Interview' as name, 'Communication and presentation skills' as description, 30 as percentage, 1 as order_index
  UNION ALL
  SELECT 2, 'Advocacy', 'Understanding of platform and advocacy', 25, 2
  UNION ALL
  SELECT 3, 'Evening Gown', 'Elegance and confidence in formal wear', 20, 3
  UNION ALL
  SELECT 4, 'Swimwear', 'Confidence and stage presence', 15, 4
  UNION ALL
  SELECT 5, 'Q&A', 'Quick thinking and response quality', 10, 5
) cat_data,
round_data
ORDER BY priority ON CONFLICT DO NOTHING;

-- 3. Create 9 Judges
INSERT INTO judges (name, url_token, active)
VALUES 
  ('Judge 1', 'judge-token-001-abcd1234efgh5678', true),
  ('Judge 2', 'judge-token-002-ijkl9012mnop3456', true),
  ('Judge 3', 'judge-token-003-qrst5678uvwx9012', true),
  ('Judge 4', 'judge-token-004-yzab1234cdef5678', true),
  ('Judge 5', 'judge-token-005-ghij9012klmn3456', true),
  ('Judge 6', 'judge-token-006-opqr5678stuv9012', true),
  ('Judge 7', 'judge-token-007-wxyz1234abcd5678', true),
  ('Judge 8', 'judge-token-008-efgh9012ijkl3456', true),
  ('Judge 9', 'judge-token-009-mnop5678qrst9012', true)
ON CONFLICT DO NOTHING;

-- 4. Assign judges to round (all 9 judges to the round)
INSERT INTO round_judges (round_id, judge_id)
SELECT r.id, j.id
FROM rounds r, judges j
WHERE r.name = 'Preliminary Competition'
  AND j.name IN ('Judge 1', 'Judge 2', 'Judge 3', 'Judge 4', 'Judge 5', 'Judge 6', 'Judge 7', 'Judge 8', 'Judge 9')
ON CONFLICT DO NOTHING;

-- 5. Assign judges to specific categories
-- Category 1 (Interview) → Judges 1-4
INSERT INTO category_judges (category_id, judge_id)
SELECT c.id, j.id
FROM categories c, judges j
WHERE c.name = 'Interview'
  AND j.name IN ('Judge 1', 'Judge 2', 'Judge 3', 'Judge 4')
ON CONFLICT DO NOTHING;

-- Categories 2-5 (Advocacy, Evening Gown, Swimwear, Q&A) → Judges 5-9
INSERT INTO category_judges (category_id, judge_id)
SELECT c.id, j.id
FROM categories c, judges j
WHERE c.name IN ('Advocacy', 'Evening Gown', 'Swimwear', 'Q&A')
  AND j.name IN ('Judge 5', 'Judge 6', 'Judge 7', 'Judge 8', 'Judge 9')
ON CONFLICT DO NOTHING;

-- 6. Create Criteria for each category
-- Category 1 (Interview) - 3 criteria
INSERT INTO criteria (category_id, name, max_points, order_index)
SELECT c.id, name, 100, order_index
FROM (
  SELECT 1 as priority, 'Communication Skills' as name, 1 as order_index
  UNION ALL
  SELECT 2, 'Confidence', 2
  UNION ALL
  SELECT 3, 'Knowledge of Platform', 3
) crit_data,
categories c
WHERE c.name = 'Interview'
ORDER BY crit_data.priority
ON CONFLICT DO NOTHING;

-- Category 2 (Advocacy) - 3 criteria
INSERT INTO criteria (category_id, name, max_points, order_index)
SELECT c.id, name, 100, order_index
FROM (
  SELECT 1 as priority, 'Passion for Cause' as name, 1 as order_index
  UNION ALL
  SELECT 2, 'Clarity of Message', 2
  UNION ALL
  SELECT 3, 'Audience Impact', 3
) crit_data,
categories c
WHERE c.name = 'Advocacy'
ORDER BY crit_data.priority
ON CONFLICT DO NOTHING;

-- Category 3 (Evening Gown) - 2 criteria
INSERT INTO criteria (category_id, name, max_points, order_index)
SELECT c.id, name, 100, order_index
FROM (
  SELECT 1 as priority, 'Elegance' as name, 1 as order_index
  UNION ALL
  SELECT 2, 'Stage Presence', 2
) crit_data,
categories c
WHERE c.name = 'Evening Gown'
ORDER BY crit_data.priority
ON CONFLICT DO NOTHING;

-- Category 4 (Swimwear) - 2 criteria
INSERT INTO criteria (category_id, name, max_points, order_index)
SELECT c.id, name, 100, order_index
FROM (
  SELECT 1 as priority, 'Confidence' as name, 1 as order_index
  UNION ALL
  SELECT 2, 'Stage Presence', 2
) crit_data,
categories c
WHERE c.name = 'Swimwear'
ORDER BY crit_data.priority
ON CONFLICT DO NOTHING;

-- Category 5 (Q&A) - 3 criteria
INSERT INTO criteria (category_id, name, max_points, order_index)
SELECT c.id, name, 100, order_index
FROM (
  SELECT 1 as priority, 'Understanding the Question' as name, 1 as order_index
  UNION ALL
  SELECT 2, 'Relevance of Answer', 2
  UNION ALL
  SELECT 3, 'Delivery', 3
) crit_data,
categories c
WHERE c.name = 'Q&A'
ORDER BY crit_data.priority
ON CONFLICT DO NOTHING;

-- 7. Create 10 Contestants
INSERT INTO contestants (number, name, sex, age)
VALUES 
  (1, 'Maria Santos', 'Female', 24),
  (2, 'Andrea Cruz', 'Female', 22),
  (3, 'Isabella Lopez', 'Female', 25),
  (4, 'Sofia Garcia', 'Female', 23),
  (5, 'Elena Martinez', 'Female', 26),
  (6, 'Juan Rodriguez', 'Male', 24),
  (7, 'Carlos Gonzalez', 'Male', 22),
  (8, 'Miguel Fernandez', 'Male', 25),
  (9, 'Diego Ramirez', 'Male', 23),
  (10, 'Antonio Moreno', 'Male', 26)
ON CONFLICT DO NOTHING;

-- 8. Add mock scores
-- Get all needed IDs
WITH data AS (
  SELECT 
    r.id as round_id,
    j.id as judge_id,
    j.name as judge_name,
    c.id as contestant_id,
    c.name as contestant_name,
    cr.id as criterion_id,
    cr.name as criterion_name,
    cr.max_points,
    ROW_NUMBER() OVER (PARTITION BY c.id, cr.id ORDER BY j.created_at) as judge_num,
    FLOOR(RANDOM() * 31 + 70)::int as random_score
  FROM rounds r
  CROSS JOIN judges j
  CROSS JOIN contestants c
  CROSS JOIN criteria cr
  INNER JOIN categories cat ON cr.category_id = cat.id AND cat.round_id = r.id
  INNER JOIN category_judges cj ON cj.category_id = cat.id AND cj.judge_id = j.id
  WHERE r.name = 'Preliminary Competition'
)
INSERT INTO contestant_scores (contestant_id, judge_id, criterion_id, score)
SELECT contestant_id, judge_id, criterion_id, (random_score::float)
FROM data
ON CONFLICT DO NOTHING;

-- 9. Verify the setup
SELECT 'Setup Complete!' as status;
SELECT COUNT(*) as judge_count FROM judges;
SELECT COUNT(*) as category_count FROM categories;
SELECT COUNT(*) as contestant_count FROM contestants;
SELECT COUNT(*) as category_judge_assignments FROM category_judges;
SELECT COUNT(*) as scores_count FROM contestant_scores;

-- Display assignments for verification
SELECT 
  'Category Assignments' as info,
  c.name as category,
  STRING_AGG(j.name, ', ' ORDER BY j.name) as judges
FROM categories c
LEFT JOIN category_judges cj ON cj.category_id = c.id
LEFT JOIN judges j ON j.id = cj.judge_id
WHERE c.round_id = (SELECT id FROM rounds WHERE name = 'Preliminary Competition')
GROUP BY c.id, c.name
ORDER BY c.order_index;
