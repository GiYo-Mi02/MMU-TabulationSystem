# Competition Editor Guide

## Overview

The Competition Editor allows admins to dynamically customize the judging categories and criteria for any pageant or competition. This replaces the hardcoded scoring system with a flexible, configurable approach.

## Features

### 🎯 Dynamic Categories

- Create unlimited categories (e.g., Opening Statement, Swimwear, Evening Gown, Q&A)
- Set percentage weight for each category (must total 100%)
- Reorder categories with drag-and-drop
- Mark categories as "Open" or "Convention" categories

### 📊 Flexible Criteria

- Add multiple scoring criteria per category
- Set custom point values for each criterion
- Criteria totals should equal 100 points per category
- Reorder criteria within categories

### ⚖️ Weighted Scoring System

The system calculates final scores using this formula:

```
Final Score = (Category1 Score × Category1%) + (Category2 Score × Category2%) + ... + (CategoryN Score × CategoryN%)
```

**Example:**

- **Opening Statement (30%)**: 85/100 points → 85 × 0.30 = 25.5
- **Swimwear (20%)**: 90/100 points → 90 × 0.20 = 18.0
- **Evening Gown (25%)**: 88/100 points → 88 × 0.25 = 22.0
- **Q&A (25%)**: 92/100 points → 92 × 0.25 = 23.0
- **Final Score**: 25.5 + 18.0 + 22.0 + 23.0 = **88.5 points**

## How to Use

### 1. Database Setup

First, run the migration SQL file in your Supabase dashboard:

```sql
-- Run the contents of: database/migration_competition_editor.sql
```

This creates three new tables:

- `categories` - Stores competition categories
- `criteria` - Stores scoring criteria for each category
- `contestant_scores` - Stores individual scores per criterion

### 2. Access the Editor

Navigate to: **Admin Dashboard → Competition Editor**
Or directly: `/admin/competition`

### 3. Create a Category

1. Click **"Add Category"** button
2. Fill in the form:

   - **Category Name**: e.g., "Opening Statement"
   - **Description**: Optional description of the category
   - **Percentage**: Weight of this category (e.g., 30%)

3. Add criteria for this category:

   - **Criteria Name**: e.g., "Stage Presence"
   - **Max Points**: e.g., 40 points
   - Click **"Add"** to add more criteria

4. Ensure:

   - Total criteria points = 100
   - Total category percentages ≤ 100%

5. Click **"Save Changes"**

### 4. Category Settings

Each category has two settings:

- **Open Category**: Check if this is an open category
- **Convention Category**: Check if this is a convention category

Toggle these checkboxes directly on the category card.

### 5. Edit or Delete Categories

- Click **"Edit"** on any category to modify it
- Click the **trash icon** to delete a category (this also deletes all scores for that category)

## Example Competition Setup

### Pageant Competition (Traditional)

1. **Opening Statement - 30%**

   - Introduction (40 pts)
   - Confidence (30 pts)
   - Originality (30 pts)
   - **Total: 100 pts**

2. **Swimwear - 20%**

   - Physical Fitness (50 pts)
   - Poise (50 pts)
   - **Total: 100 pts**

3. **Evening Gown - 25%**

   - Stage Presence (40 pts)
   - Elegance (30 pts)
   - Overall Impact (30 pts)
   - **Total: 100 pts**

4. **Question & Answer - 25%**
   - Content (40 pts)
   - Delivery (30 pts)
   - Composure (30 pts)
   - **Total: 100 pts**

**Total Percentage: 100%** ✅

### Talent Competition

1. **Technical Skill - 40%**

   - Execution (60 pts)
   - Difficulty (40 pts)
   - **Total: 100 pts**

2. **Artistic Expression - 35%**

   - Creativity (50 pts)
   - Emotional Impact (50 pts)
   - **Total: 100 pts**

3. **Stage Presence - 25%**
   - Confidence (50 pts)
   - Audience Engagement (50 pts)
   - **Total: 100 pts**

**Total Percentage: 100%** ✅

## Validation Rules

### Category Percentages

- Must be greater than 0
- Total of all categories must equal 100%
- Visual indicator shows:
  - 🟢 Green: Exactly 100% (perfect!)
  - 🟡 Yellow: Less than 100% (need more)
  - 🔴 Red: Over 100% (too much!)

### Criteria Points

- Each criterion must be greater than 0
- Recommended: Total criteria per category = 100 points
- Visual indicator shows total points for each category

## Impact on Judges

Once you set up categories:

1. Judges will see the custom categories when scoring
2. Each criterion appears as a separate input field
3. Max points are enforced (judges can't exceed the limit)
4. Scores are automatically calculated using the weighted formula

## Impact on Results

The leaderboard and results pages will:

1. Display scores broken down by category
2. Show weighted totals automatically
3. Rank contestants by final weighted score
4. Display individual criterion scores for transparency

## Tips & Best Practices

1. **Plan Your Categories First**: Decide on percentages before creating categories
2. **Round Numbers**: Use percentages that are easy to calculate (5%, 10%, 15%, etc.)
3. **Balanced Criteria**: Keep criteria points fairly distributed within each category
4. **Clear Names**: Use descriptive names that judges will understand
5. **Test First**: Create a test competition to ensure scoring works as expected

## Troubleshooting

**Q: I can't save a category - percentage error**

- A: Make sure total percentages don't exceed 100%

**Q: Criteria don't add up to 100**

- A: While not required, it's recommended for easier judging

**Q: Can I change categories after judges have scored?**

- A: Yes, but be careful - changing categories may affect existing scores

**Q: What happens to old scores if I delete a category?**

- A: All scores for that category are permanently deleted (CASCADE delete)

## Technical Details

### Database Schema

```sql
categories {
  id: UUID (primary key)
  name: TEXT
  description: TEXT
  percentage: DECIMAL(5,2)
  order_index: INTEGER
  is_open: BOOLEAN
  is_convention: BOOLEAN
}

criteria {
  id: UUID (primary key)
  category_id: UUID (foreign key)
  name: TEXT
  max_points: INTEGER
  order_index: INTEGER
}

contestant_scores {
  id: UUID (primary key)
  contestant_id: UUID (foreign key)
  judge_id: UUID (foreign key)
  criterion_id: UUID (foreign key)
  score: DECIMAL(5,2)
}
```

### Score Calculation Flow

1. Judge submits scores for each criterion
2. System calculates category total: `SUM(criterion scores)`
3. System normalizes to 100: `(total / max_possible) × 100`
4. System applies category weight: `normalized_score × category_percentage`
5. Final score: `SUM(all weighted category scores)`

## Support

For questions or issues:

1. Check this guide first
2. Review the example setups above
3. Test in a development environment before production use
