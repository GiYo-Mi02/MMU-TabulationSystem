# Judge Test Links

Click any link below to test as that judge:

## Category 1 Only (Interview) - 30% weight

- [Judge 1](http://localhost:5173/judge/judge-token-001-abcd1234efgh5678)
- [Judge 2](http://localhost:5173/judge/judge-token-002-ijkl9012mnop3456)
- [Judge 3](http://localhost:5173/judge/judge-token-003-qrst5678uvwx9012)
- [Judge 4](http://localhost:5173/judge/judge-token-004-yzab1234cdef5678)

## Categories 2-5 (Advocacy, Gown, Swimwear, Q&A) - 25%, 20%, 15%, 10%

- [Judge 5](http://localhost:5173/judge/judge-token-005-ghij9012klmn3456)
- [Judge 6](http://localhost:5173/judge/judge-token-006-opqr5678stuv9012)
- [Judge 7](http://localhost:5173/judge/judge-token-007-wxyz1234abcd5678)
- [Judge 8](http://localhost:5173/judge/judge-token-008-efgh9012ijkl3456)
- [Judge 9](http://localhost:5173/judge/judge-token-009-mnop5678qrst9012)

---

## Admin Links

- [Admin Dashboard](http://localhost:5173/admin)
- [Judges Management](http://localhost:5173/admin/judges)
- [Competition Editor](http://localhost:5173/admin/competition)
- [Live Scoreboard](http://localhost:5173/admin/leaderboard)
- [Public Leaderboard](http://localhost:5173/leaderboard)

---

## Quick Test Path

1. **Setup:** Run `seed-mock-data.sql` in Supabase
2. **Test Judge 1:** Click link above → Should see only "Interview"
3. **Test Judge 5:** Click link above → Should see 4 categories (not Interview)
4. **Test Real-time:** In new tab, go to Admin → Judges
5. **Assign Category:** Add Judge 1 to "Advocacy"
6. **Watch Update:** Judge 1's tab should show "Advocacy" appear instantly
7. **Check Leaderboard:** Go to Live Scoreboard → Verify scores are correct

---

## Test Data

**9 Judges:**

- Judges 1-4: Interview only
- Judges 5-9: Advocacy, Evening Gown, Swimwear, Q&A

**5 Categories:**

1. Interview (30%) - 3 criteria - 4 judges
2. Advocacy (25%) - 3 criteria - 5 judges
3. Evening Gown (20%) - 2 criteria - 5 judges
4. Swimwear (15%) - 2 criteria - 5 judges
5. Q&A (10%) - 3 criteria - 5 judges

**10 Contestants:**

- 5 Female, 5 Male
- All have mock scores for all judges/categories
