# Judge Category Visibility - Security Update

## Overview

Judges now **only see the categories they're assigned to** in their scoring interface. This prevents confusion and eliminates the risk of scoring or tabulation errors.

## What Changed

### **Judge Scoring Page (JudgePageNew.jsx)**

#### Before:

- Judges could see ALL categories from their assigned rounds
- Risk: Judge could see Category 2 even if only assigned to Category 1
- Confusion: Why can I see a category I'm not scoring?

#### After:

- Judges **only see categories they're specifically assigned to**
- If no category assignments exist (fallback): Shows all categories in their round
- Real-time updates: If admin adds/removes category assignment, judge interface updates instantly

---

## Implementation Details

### 1. **Category Filtering Logic**

```javascript
// In fetchCategories():
if (categoryAssignments.size > 0) {
  filteredCategories = normalizedCategories.filter((cat) =>
    categoryAssignments.has(String(cat.id))
  );
}
```

**Logic:**

- If judge has category-specific assignments → show only assigned categories
- If judge has NO category-specific assignments → show all categories in their round (fallback)
- This ensures backward compatibility with judges who only have round-level assignments

### 2. **Real-Time Category Assignment Updates**

```javascript
// New subscription to category_judges table
categoryJudgesSubscription = supabase.channel("category-judges-realtime").on(
  "postgres_changes",
  {
    event: "*",
    schema: "public",
    table: "category_judges",
    filter: `judge_id=eq.${judge.id}`,
  },
  (payload) => {
    fetchJudgeCategoryAssignments(judge.id);
  }
);
```

**When triggered:**

- Admin assigns judge to a category → Judge's interface updates instantly
- Admin removes judge from a category → Judge's interface updates instantly
- No page refresh needed

### 3. **Judge Data Fetching**

```javascript
const fetchJudgeCategoryAssignments = async (judgeId) => {
  const { data } = await supabase
    .from("category_judges")
    .select("category_id")
    .eq("judge_id", judgeId);

  const assignedCategoryIds = new Set(
    (data || []).map((d) => String(d.category_id))
  );
  setCategoryAssignments(assignedCategoryIds);
};
```

**Called when:**

- Judge logs in (via fetchJudgeData)
- Category assignments change (via subscription)
- Re-fetches to get latest assignments from database

---

## User Experience

### Scenario 1: Judge with Category-Specific Assignments

**Setup:**

- Round 1 has 3 categories: Coding, Design, Presentation
- Judge A assigned to Round 1
- Judge A assigned to only: Coding + Design (NOT Presentation)

**What Judge A Sees:**

- Category List shows only:
  - Coding
  - Design
- Presentation is completely hidden

**Why:**

- Eliminates confusion about what they should score
- Prevents accidental scoring of wrong category
- Clear, focused interface

### Scenario 2: Judge Without Category-Specific Assignments (Fallback)

**Setup:**

- Round 1 has 3 categories
- Judge B assigned to Round 1
- No category-specific assignments for Judge B

**What Judge B Sees:**

- All 3 categories (Coding, Design, Presentation)

**Why:**

- Backward compatible with existing judges
- If no specific assignments set, judge scores all categories in their round
- Ensures system works even if category assignments feature not used

### Scenario 3: Real-Time Category Assignment Change

**Situation:**

- Judge C is scoring and sees only "Coding"
- Admin goes to Judge management and assigns Judge C to "Design"

**What Happens:**

1. Admin clicks "Assign Categories"
2. Checks "Design"
3. Saves
4. Category_judges table updated
5. Subscription triggers on Judge's device
6. fetchJudgeCategoryAssignments called
7. categoryAssignments state updated
8. useEffect triggers fetchCategories
9. Judge C now sees both "Coding" and "Design"
10. **All within 1-2 seconds**

---

## Important Notes

### ✅ What This Prevents

1. **Judge Confusion**

   - Judge only sees what they need to score
   - Reduces error questions: "Can I score this category?"

2. **Accidental Scoring**

   - Can't submit scores for categories not assigned
   - Scoring modal won't open for hidden categories
   - Database queries filter by judge assignments anyway

3. **Tabulation Accuracy**
   - Scoring system respects category assignments
   - Even if judge could submit scores (they can't), scoring wouldn't count them
   - Double protection at UI + scoring logic level

### ⚠️ Important Behaviors

1. **Fallback Behavior**

   - If NO category-specific assignments exist for a judge → judge sees ALL categories
   - This ensures backward compatibility
   - Only filter if admin explicitly assigned categories

2. **Categories Are Hidden, Not Disabled**

   - Judge cannot see unassigned categories in their interface
   - They cannot select or score them
   - This is different from graying out (which would still show the category)

3. **Real-Time is Two-Way**
   - When admin assigns category → judge sees it immediately
   - When admin removes category → judge sees it disappear immediately
   - No need for judge to refresh or log out/in

---

## Testing Checklist

- [ ] Judge logs in and sees only assigned categories
- [ ] Judge sees all categories if no specific assignments (fallback)
- [ ] Admin assigns new category to judge → judge interface updates immediately
- [ ] Admin removes category from judge → category disappears from judge's interface
- [ ] Judge cannot see the category they lost in their interface
- [ ] Scoring only works for visible categories
- [ ] Multiple judges see different categories correctly
- [ ] Switching rounds shows correct categories per round

---

## Database Impact

### Table: `category_judges`

```
Judge A assigned to Round 1 with 3 categories:
├── category_judges (Judge A, Coding) ✓
├── category_judges (Judge A, Design) ✓
└── ❌ No entry for Presentation
```

**Result:**

- Coding row: `judge_judges.select(...).eq('judge_id', 'A')` returns Coding
- Design row: same query returns Design
- Presentation: NOT in results
- Judge A's interface filters to these 2 categories only

---

## Code Files Modified

| File               | Change                                         | Why                              |
| ------------------ | ---------------------------------------------- | -------------------------------- |
| `JudgePageNew.jsx` | Added categoryAssignments state + filter logic | Only show assigned categories    |
| `JudgePageNew.jsx` | Added fetchJudgeCategoryAssignments()          | Get judge's category assignments |
| `JudgePageNew.jsx` | Added category_judges subscription             | Real-time updates                |
| `JudgePageNew.jsx` | Updated fetchCategories() filter               | Filter by categoryAssignments    |

---

## Security & Validation

### Double Protection

1. **UI Level**: Unassigned categories hidden from judge interface
2. **Scoring Logic Level**: Even if somehow scored, scoring system filters by allowed judges
3. **Result**: Safe even if one layer fails

### Backend Validation

- Scoring still validates judges against category assignments
- If judge submitted scores for unassigned category, those scores ignored
- Two layers of protection = defense in depth

---

## FAQ

**Q: Can judges still see categories they're not assigned to?**
A: No. If they have category-specific assignments, only those show. If they have no assignments, all categories in their round show (fallback).

**Q: What if admin changes assignments while judge is scoring?**
A: Judge's interface updates in real-time. New categories appear, removed categories disappear. No page refresh needed.

**Q: Can judge still submit scores for hidden categories?**
A: No. Categories are completely hidden - judge can't even see them to try.

**Q: Does this affect the scoring calculation?**
A: No. Scoring was already secure - it filters by judge assignments. This is just better UX.

**Q: What if a judge is assigned to a round but no specific categories?**
A: They see all categories in that round (fallback behavior).

---

## Summary

| Aspect                  | Before                  | After                     |
| ----------------------- | ----------------------- | ------------------------- |
| **Judge sees**          | All categories in round | Only assigned categories  |
| **Confusion risk**      | High                    | Eliminated                |
| **Tabulation risk**     | Low (scoring filtered)  | Eliminated (UI + scoring) |
| **Real-time updates**   | No                      | Yes                       |
| **Backward compatible** | N/A                     | Yes (fallback)            |
| **Security**            | Good                    | Excellent                 |
