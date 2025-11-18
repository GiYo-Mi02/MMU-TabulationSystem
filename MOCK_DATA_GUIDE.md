# Mock Data Testing Guide

## Quick Setup

### Step 1: Run the Seed Script

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Create a **New Query**
4. Copy and paste entire contents from: `database/seed-mock-data.sql`
5. Click **Run** (or Ctrl+Enter)
6. You should see: "Setup Complete!" with verification stats

### Step 2: Verify the Data

After running, you'll see a summary table showing:

- Category 1 (Interview) → Judges 1, 2, 3, 4
- Category 2 (Advocacy) → Judges 5, 6, 7, 8, 9
- Category 3 (Evening Gown) → Judges 5, 6, 7, 8, 9
- Category 4 (Swimwear) → Judges 5, 6, 7, 8, 9
- Category 5 (Q&A) → Judges 5, 6, 7, 8, 9

---

## Test Scenarios

### Scenario 1: Judge Sees Only Assigned Categories

**Test Judge 1 (Only sees Category 1):**

1. Go to `/judge/judge-token-001-abcd1234efgh5678`
2. Should see only **Interview** category
3. Should NOT see: Advocacy, Evening Gown, Swimwear, Q&A

**Test Judge 5 (Sees Categories 2-5):**

1. Go to `/judge/judge-token-005-ghij9012klmn3456`
2. Should see: **Advocacy, Evening Gown, Swimwear, Q&A**
3. Should NOT see: Interview

---

### Scenario 2: Real-Time Category Assignment Updates

**Setup:**

1. Judge 1 is currently assigned to only Category 1
2. Open two browser windows:
   - Window A: Judge 1 scoring page
   - Window B: Admin Judges page

**Test:**

1. In Window B, click "Assign Categories" for Judge 1
2. Add Judge 1 to "Advocacy" category
3. Save
4. In Window A, you should **instantly** see "Advocacy" appear
5. Remove Judge 1 from "Advocacy"
6. In Window A, "Advocacy" should **instantly** disappear

**Expected:** Changes happen within 1-2 seconds without page refresh

---

### Scenario 3: Leaderboard Accuracy

**Test:**

1. Go to Admin → Live Scoreboard
2. Check contestant rankings
3. Verify scores use correct number of judges:
   - Category 1: Average of 4 judges
   - Categories 2-5: Average of 5 judges each

**How to verify:**

- Manually calculate one contestant's score
- Compare with leaderboard
- Should match exactly

---

### Scenario 4: Judge Cannot See Hidden Categories

**Setup:**

- Open browser developer tools (F12)
- Go to Judge 1's scoring page

**Test:**

1. In Console, search DOM for "Advocacy"
2. Should not find any element
3. Advocacy category is completely hidden (not grayed out)
4. Judge cannot access it even if they try

---

## Judge Login Tokens

Copy/paste these URLs to test as different judges:

```
Judge 1: /judge/judge-token-001-abcd1234efgh5678
Judge 2: /judge/judge-token-002-ijkl9012mnop3456
Judge 3: /judge/judge-token-003-qrst5678uvwx9012
Judge 4: /judge/judge-token-004-yzab1234cdef5678
Judge 5: /judge/judge-token-005-ghij9012klmn3456
Judge 6: /judge/judge-token-006-opqr5678stuv9012
Judge 7: /judge/judge-token-007-wxyz1234abcd5678
Judge 8: /judge/judge-token-008-efgh9012ijkl3456
Judge 9: /judge/judge-token-009-mnop5678qrst9012
```

---

## Contestants

10 total contestants (5 Female, 5 Male):

- **Female:** Maria Santos, Andrea Cruz, Isabella Lopez, Sofia Garcia, Elena Martinez
- **Male:** Juan Rodriguez, Carlos Gonzalez, Miguel Fernandez, Diego Ramirez, Antonio Moreno

---

## Categories & Weights

| Category     | Weight | Judges        |
| ------------ | ------ | ------------- |
| Interview    | 30%    | 1, 2, 3, 4    |
| Advocacy     | 25%    | 5, 6, 7, 8, 9 |
| Evening Gown | 20%    | 5, 6, 7, 8, 9 |
| Swimwear     | 15%    | 5, 6, 7, 8, 9 |
| Q&A          | 10%    | 5, 6, 7, 8, 9 |

---

## What Gets Created

✅ **1 Round** - "Preliminary Competition"
✅ **5 Categories** - As above
✅ **9 Judges** - With specific category assignments
✅ **10 Contestants** - Mix of male/female
✅ **Criteria** - 3 criteria for Interview/Advocacy/Q&A, 2 for Gown/Swimwear
✅ **Mock Scores** - Random scores (70-100) for all judge-contestant-criterion combinations

---

## Testing Checklist

- [ ] Judge 1 logs in → sees only "Interview"
- [ ] Judge 5 logs in → sees "Advocacy, Evening Gown, Swimwear, Q&A"
- [ ] Admin assigns Judge 1 to "Advocacy" → Judge 1 sees it instantly
- [ ] Admin removes Judge 1 from "Advocacy" → Judge 1 loses it instantly
- [ ] Leaderboard shows correct scores using assigned judges
- [ ] Completion rates show correct judge counts
- [ ] Category filters work (by gender, etc.)
- [ ] Scoring works for assigned categories
- [ ] Scoring is blocked for non-assigned categories

---

## Cleanup (Optional)

To start fresh and remove all mock data:

```sql
DELETE FROM contestant_scores;
DELETE FROM category_judges;
DELETE FROM round_judges;
DELETE FROM criteria;
DELETE FROM categories;
DELETE FROM rounds;
DELETE FROM judges;
DELETE FROM contestants;
```

Then run the seed script again.

---

## Troubleshooting

**Q: I see "Setup Complete!" but no categories?**
A: Refresh the page. It might be cached.

**Q: Judge 5 can still see "Interview"?**
A: Check that category_judges table has the correct entries. Run the verification query at the end of the seed script.

**Q: Scores look wrong?**
A: Verify in the seed script that all criteria got created. Check the categories' weights add up to 100%.

**Q: Real-time updates not working?**
A: Check browser console for subscription errors. Make sure judge is still on the page when you make changes.

---

## Admin Notes

- All judges are **active**
- All judges are **assigned to the round**
- Category-specific assignments are in `category_judges` table
- Mock scores are random between 70-100
- All judges scored all contestants (complete data set)

This ensures you can test the full system without needing to manually enter scores!
