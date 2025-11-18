# Category-Specific Judge Assignments Guide

## Overview

You can now assign judges to specific categories within their assigned rounds. This enables fine-grained control over which judges score which categories.

## Where to Edit

### 1. **JudgesList.jsx** - Assign Categories to Judges

**File:** `src/components/admin/JudgesList.jsx`

**What was added:**

- New "Assign Categories" button next to "Assign Rounds" button
- New `JudgeCategoriesModal` component for category assignment
- Real-time subscriptions to `category_judges` table
- Fetches category assignments from the database

**How to use:**

1. Go to Admin → Judges
2. Click "Assign Categories" button on any judge card
3. A modal will show all categories from their assigned rounds
4. Check/uncheck categories to assign or remove the judge
5. Click "Save Categories"

**Key locations in file:**

- Line ~12: Import `Target` icon from lucide-react
- Line ~165: `JudgeCategoriesModal` component definition
- Line ~240: State for `isCategoriesModalOpen` and `categoryAssignments`
- Line ~335: Category assignment subscription and data fetching
- Line ~455: "Assign Categories" button in judge card
- Line ~510: Modal instantiation at bottom of component

---

### 2. **ResultsBoard.jsx** - Use Category Assignments in Scoring

**File:** `src/components/admin/ResultsBoard.jsx`

**What was updated:**

- Fetches `category_judges` data alongside `round_judges`
- Passes category assignments to `computeCompetitionStandings()`
- Real-time subscriptions to category judge changes
- Leaderboard automatically recalculates when categories are assigned

**How to use:**

- No changes needed - scoring automatically respects category assignments
- When you assign judges to categories, scores are recalculated immediately
- Judges only count for categories they're assigned to

**Key locations in file:**

- Line ~20: New state `categoryAssignments`
- Line ~25: New subscription channel for `category_judges` table
- Line ~75-85: Category assignments processing
- Line ~90: Pass `categoryJudgeAssignments` to `computeCompetitionStandings()`
- Line ~105: Fetch `category_judges` in Promise.all()
- Line ~130: Set `categoryAssignments` state

---

### 3. **scoring.js** - Apply Category Assignments to Score Calculation

**File:** `src/lib/scoring.js`

**What was updated:**

- `computeCompetitionStandings()` now accepts `categoryJudgeAssignments` parameter
- Logic prioritizes category-specific judge assignments over round assignments
- If a judge isn't assigned to a specific category, falls back to round assignment

**How the logic works:**

```javascript
// Pseudocode
if (judge assigned to category) {
  use category-specific judges
} else {
  use round-level judges (fallback)
}
```

**Key locations in file:**

- Line ~298: Function signature updated with `categoryJudgeAssignments = {}`
- Line ~338-348: Normalize category judge assignments
- Line ~363-375: Apply category-specific judge assignments to categories
  - Line 370-373: Priority logic that uses category assignments first

---

### 4. **Database Migration** - Create the Junction Table

**File:** `database/add-category-judges-junction.sql`

**Purpose:** Creates the `category_judges` table to link judges to specific categories

**Table structure:**

```sql
CREATE TABLE category_judges (
    id UUID PRIMARY KEY,
    category_id UUID REFERENCES categories(id),
    judge_id UUID REFERENCES judges(id),
    created_at TIMESTAMP,
    UNIQUE(category_id, judge_id)
);
```

**To apply this migration:**

1. Open Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `add-category-judges-junction.sql`
4. Click "Run"

---

## Use Cases

### Scenario: Different Judges for Each Category

**Setup:**

- Round 1 has 3 categories: Coding, Design, Presentation
- You have 5 judges total
- You want specific judges for each category

**Steps:**

1. Assign all 5 judges to Round 1 (via "Assign Rounds")
2. Then for each judge:
   - Click "Assign Categories"
   - Check only the categories they should score
   - Save

**Result:**

- Judge A scores only Coding + Design
- Judge B scores only Coding + Presentation
- Judge C scores only Design
- Etc.

---

### Scenario: Some Judges Skip a Category

**Setup:**

- All judges assigned to Round 1
- But Judge A is sick and can't score the Presentation category

**Steps:**

1. Click "Assign Categories" for Judge A
2. Uncheck "Presentation"
3. Save

**Result:**

- Judge A scores Coding and Design only
- Scores calculated with Judge A excluded from Presentation
- Leaderboard automatically adjusts

---

## Technical Details

### Data Flow

```
JudgesList.jsx (Admin selects categories)
    ↓
Supabase category_judges table
    ↓
ResultsBoard.jsx (fetches assignments)
    ↓
computeCompetitionStandings() in scoring.js
    ↓
Leaderboard displays accurate scores
```

### Real-Time Updates

- When you assign/unassign a category: `category_judges` table changes
- Subscription triggers: `fetchData()` in both JudgesList and ResultsBoard
- Leaderboard recalculates instantly
- Judges' category list updates in real-time

---

## Testing

### Test Case 1: Basic Assignment

1. Go to Judges page
2. Click "Assign Categories" on any judge
3. Check/uncheck categories
4. Save and verify in database

### Test Case 2: Scoring Impact

1. Assign judges to specific categories
2. Submit some test scores
3. Go to Results board
4. Verify scores only use assigned judges
5. Unassign a judge from a category
6. Verify score recalculates immediately

### Test Case 3: Round Assignment Still Works

1. Assign Judge A to Round 1 only
2. Don't set any category assignments
3. Verify scores use all Round 1 judges (fallback behavior)

---

## FAQ

**Q: What if a judge is assigned to a round but no categories?**
A: The judge counts as assigned to all categories in that round (fallback behavior).

**Q: What if I remove a judge from a category after they scored?**
A: Their scores for that category are excluded from the leaderboard immediately.

**Q: Can a judge be assigned to a category in a round they're not assigned to?**
A: No - you must first assign a judge to a round via "Assign Rounds" before they can be assigned to categories.

**Q: Is there a bulk assignment feature?**
A: Not yet - assignments are per-judge currently. You can speed it up by using the same pattern for multiple judges.

---

## Database Schema

```sql
-- Existing tables
judges
├── id (PK)
├── name
├── active
└── ...

rounds
├── id (PK)
├── name
└── ...

categories
├── id (PK)
├── name
├── round_id (FK)
└── ...

-- New table
category_judges
├── id (PK)
├── judge_id (FK → judges)
├── category_id (FK → categories)
└── UNIQUE(judge_id, category_id)

-- Existing junction table (round level)
round_judges
├── id (PK)
├── judge_id (FK → judges)
├── round_id (FK → rounds)
└── UNIQUE(judge_id, round_id)
```

---

## Summary

| Component               | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| `JudgesList.jsx`        | UI for assigning judges to categories          |
| `ResultsBoard.jsx`      | Fetch and pass category assignments to scorer  |
| `scoring.js`            | Apply category filters when calculating scores |
| `category_judges` table | Store judge-category relationships             |

The system maintains **two levels of judge assignment**:

1. **Round level** (`round_judges`): Which rounds a judge participates in
2. **Category level** (`category_judges`): Which specific categories within those rounds
