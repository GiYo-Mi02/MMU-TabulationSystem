# MMU Tabulation System

Real-time, multi-round tabulation for pageants and competitions. Built with React + Vite, TailwindCSS, and Supabase (PostgreSQL + Realtime).

## Features

- Multi-round competitions with per-round categories and weights
- Real-time updates for judges, admins, and public leaderboards (no refresh)
- Judge panel with unique tokenized URL, mobile-first design, and progress tracking
- Admin Competition Editor to define rounds, categories, and criteria
- Per-round judge allocations, advancement caps, and highlight quotas
- Lock/unlock scoring globally from Admin and reflect instantly on all judges
- Public leaderboard with podium view, gender filters, and CSV export (admin)
- Assistance request workflow from judge devices to admins
- Live connection indicator and resilient realtime subscriptions

## How it works (at a glance)

1. Admin configures rounds, categories, and criteria in the Competition Editor.
2. Judges open their unique URL and submit scores per criterion for each contestant; scores write to `contestant_scores`.
3. Leaderboards compute totals live in the browser using `src/lib/scoring.js`, listening to Supabase realtime for instant updates.
4. The currently active round is synced in the `settings` table via keys:
   - `active_round_id` (string id)
   - `round_name` (display label)
   - `is_locked` (`"true"`/`"false"`)

When admins switch rounds, the judge page and leaderboards re-filter automatically. If a round includes a `judge_target`, the judge page and leaderboards treat that number as the expected submission count per criterion for completion metrics.

## Scoring formula (documented)

All scoring lives in `src/lib/scoring.js`. The system supports any number of categories per round and any number of criteria per category.

Terminology

- Category: Has a percentage weight (e.g., 40%).
- Criterion: Has a `max_points` (e.g., 20). Judges enter scores up to `max_points`.

Per-contestant, per-category

1. Average criterion score across all judges for each criterion.
2. Sum those averages to get the category total.
3. Normalize category total to 100 using the criterion max sum:
   - `normalized = (sum_of_criterion_averages / sum_of_criterion_max_points) × 100`
4. Apply category weight:
   - `weighted = normalized × (category.percentage / 100)`

Per-round total

- `totalWeightedScore = sum(category weighted values)` for that round.
- Contestants rank by `totalWeightedScore` (desc).

Overall total

- Same computation across all categories of all rounds (useful for global rankings).

Gender handling and highlights

- Gender values are normalized (male/female/other) for ranking splits.
- Each round can set per-gender limits:
  - participation: `max_per_gender` (or `participants_per_gender`)
  - advancement: `advance_per_gender`
  - highlight: `highlight_per_gender`
- Leaderboards annotate gender rank and highlight the top N per gender when configured.

Implementation quick-links

- `computeCompetitionStandings` — orchestrates overall and per-round rankings
- `calculateContestantRoundScore` — computes weighted totals and completion stats

## Core screens

- Admin Dashboard (`/admin`) — Stats and quick links
- Competition Editor (`/admin/competition`) — Rounds, categories, criteria, and active round
- Contestants (`/admin/contestants`) — Manage roster and photos
- Judges (`/admin/judges`) — Create unique judge URLs and activate/deactivate
- Admin Leaderboard (`/admin/leaderboard`) — Live, filterable standings + CSV export
- Public Leaderboard (`/leaderboard`) — Podium and full rankings for display
- Judge Panel (`/judge/:token`) — Personalized scoring interface (JudgePageNew)

## Data model (Supabase tables)

The app expects the following tables (field names inferred from code):

- `contestants`: id, number, name, sex, photo_url, created_at
- `judges`: id, name, url_token, active, created_at
- `rounds`: id, name, order_index, max_per_gender, advance_per_gender, highlight_per_gender
  - Optional metadata: `judge_target` (expected judge submissions per criterion)
- `categories`: id, name, description, percentage, round_id, order_index, is_open, is_convention
- `criteria`: id, category_id, name, max_points, order_index
- `contestant_scores`: id, contestant_id, judge_id, criterion_id, score, created_at
- `settings`: key (unique), value (text)
- `assistance_requests`: id, judge_id, status, resolved_by, created_at
- `photos` (optional helper used by ContestantsList): id, url, contestant_id

Notes

- Ensure a unique constraint on `settings.key` (the code uses upsert with `onConflict: 'key'`).
- RLS rules should allow the app to read and write as needed (typical for event networks). Adjust for your security posture.

## Environment and setup

Prerequisites

- Node.js 18+
- A Supabase project (URL + anon key)

1. Install dependencies

   ```bash
   npm install
   ```

2. Configure environment

   Create a `.env` file in the project root:

   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Start the dev server

   ```bash
   npm run dev
   ```

The app runs via Vite. Default preview typically appears at `http://localhost:5173` (or the port shown in your terminal).

## Using the system (end-to-end)

1. Define rounds in the Competition Editor. If none exist, the app seeds four defaults (Preliminary Showcase, Semifinal Performance, Final Evening Gown, Crowning Q&A) with per-round judge targets and advancement caps.
2. Create categories under each round and add criteria with `max_points`. Set category percentages per round (round weight = sum of its categories’ percentages).
3. Add contestants (number, name, gender/sex, optional photo URL).
4. Add judges. Send each judge their unique link (tokenized URL).
5. Set the active round from the Competition Editor. The app writes `active_round_id` and `round_name` into `settings`, so all clients update live.
6. Judges score each criterion. Submissions write to `contestant_scores`; re-submitting overwrites prior scores for that judge/contestant.
7. Watch the Admin/Public leaderboard update in real time. Use gender filters or export CSV from the admin view.
8. Lock scoring from Admin when a round ends (`is_locked = "true"`). Judge UIs prevent submissions until unlocked.

## Real-time behavior

- The app subscribes to changes on: `contestant_scores`, `categories`, `criteria`, `settings`, `rounds`, `contestants`.
- Active round changes propagate instantly to judge devices and leaderboards.
- A Live indicator shows realtime connectivity on display views.

## CSV export (admin)

From `/admin/leaderboard`, export the displayed rankings (overall or specific round, filtered by gender). File names include round/gender and date.

## Troubleshooting

Missing Supabase environment variables

- Ensure `.env` contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

Realtime not updating

- Confirm Supabase Realtime is enabled for your project and tables.
- Check the browser console for subscription errors.

409 conflicts on settings writes

- Add a unique constraint on `settings.key` (e.g., primary key or unique index). The app uses upsert with `onConflict: 'key'`).

Judges stuck on the wrong round

- Ensure `active_round_id` in `settings` is a string matching the round `id`.
- Use the Competition Editor to set the active round; clients will sync automatically.

## Tech stack

- React 18 + Vite
- TailwindCSS
- Supabase (PostgreSQL + Realtime)
- React Router v6
- Lucide React icons
- Sonner for toasts

## Scripts

- `npm run dev` — Start Vite dev server
- `npm run build` — Production build
- `npm run preview` — Preview production build
- `npm run lint` — ESLint

## License

MIT — use and adapt for your events.

## Credits

Built for smooth, reliable pageant tabulation — with real-time, multi-round scoring.

# MMU Tabulation System

Real‑time, multi‑round tabulation for pageants and competitions. Built with React + Vite, TailwindCSS, and Supabase (PostgreSQL + Realtime).

## Features

- Multi‑round competitions with per‑round categories and weights
- Real‑time updates for judges, admins, and public leaderboards (no refresh)
- Judge panel with unique tokenized URL, mobile‑first design, and progress tracking
- Admin Competition Editor to define rounds, categories, and criteria
- Per‑round judge allocations, advancement caps, and highlight quotas
- Lock/unlock scoring globally from Admin and reflect instantly on all judges
- Public leaderboard with podium view, gender filters, and CSV export (admin)
- Assistance request workflow from judge devices to admins
- Live connection indicator and resilient realtime subscriptions

## How it works (at a glance)

1. Admin configures Rounds, Categories, and Criteria in the Competition Editor.

2. Judges open their unique URL and submit scores per criterion for each contestant. Scores write to `contestant_scores`.

3. Leaderboards compute totals live in the browser using `src/lib/scoring.js`, listening to Supabase realtime for instant updates.

4. The currently active round is synced in the `settings` table using keys:
   - `active_round_id` (string id)
   - `round_name` (display label)
   - `is_locked` (`"true"`/`"false"`)

When admins switch rounds, the judge page and leaderboards re-filter automatically by that round.
When `rounds.judge_target` is set, leaderboards and judge panels treat that value as the expected submission count per criterion for the round.

## Scoring formula (documented)

All scoring is defined in `src/lib/scoring.js`. The system supports any number of categories per round and any number of criteria per category.

Terminology

- Category: Has a percentage weight (e.g., 40%).
- Criterion: Has a max_points (e.g., 20). Judges enter scores up to max_points.

Per-Contestant, Per-Category

1. Average criterion score across all judges for each criterion.
2. Sum those averages to get the category total.
3. Normalize category total to 100 using the criterion max sum:
   - normalized = (sum_of_criterion_averages / sum_of_criterion_max_points) × 100
4. Apply category weight:
   - weighted = normalized × (category.percentage / 100)

Per Round total

- totalWeightedScore = sum of all category weighted values in that round.
- Contestants are ranked by totalWeightedScore (desc).

Overall total

- Same computation across all categories of all rounds (useful when you want a global ranking).

Gender handling and highlights

- Gender values are normalized (male/female/other) for ranking splits.
- Each round can set per‑gender limits:
  - participation: `max_per_gender` (or `participants_per_gender`)
  - advancement: `advance_per_gender`
  - highlight: `highlight_per_gender`
- Leaderboards annotate gender rank and highlight the top N per gender when configured.

The implementation details live in:

- Per‑round judge allocations, advancement caps, and highlight quotas
- Judges (`/admin/judges`) — Create unique judge URLs and activate/deactivate
- Admin Leaderboard (`/admin/leaderboard`) — Live, filterable standings + CSV export
- Public Leaderboard (`/leaderboard`) — Podium and full rankings for display
- Judge Panel (`/judge/:token`) — Personalized scoring interface (JudgePageNew)

## Data model (Supabase tables)

The app expects the following tables (field names inferred from code):

- `contestants`: id, number, name, sex, photo_url, created_at
- `rounds`: id, name, order_index, max_per_gender, advance_per_gender, highlight_per_gender
  - Optional metadata: `judge_target` (expected judge submissions per criterion)
- `categories`: id, name, description, percentage (number), round_id, order_index, is_open (bool?), is_convention (bool?)
- `criteria`: id, category_id, name, max_points (number), order_index
- `contestant_scores`: id, contestant_id, judge_id, criterion_id, score (number), created_at
- `settings`: key (unique), value (text)
- `assistance_requests`: id, judge_id, status (pending|resolved|cancelled), resolved_by, created_at
- `photos` (optional helper used by ContestantsList): id, url, contestant_id

Notes

- Ensure a unique constraint on `settings.key` (the code uses upsert with `onConflict: 'key'`).
- RLS rules should allow the app to read and write as needed (typical for event networks). Adjust for your security posture.

## Environment and setup

- Node.js 18+
- A Supabase project (URL + anon key)

1. Install dependencies

```bash
npm install
```

Create a `.env` file in the project root:

VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

````


```bash
npm run dev
The app runs via Vite. Default preview is typically `http://localhost:5173` (or the port shown in your terminal).

## Using the system (end‑to‑end)
6. Judges score each criterion. Submissions write to `contestant_scores`. Re‑submitting overwrites prior scores for that judge/contestant.
7. Watch the Admin/Public leaderboard update in real time. Use gender filters or export CSV from the admin view.
8. Lock scoring from Admin when a round ends (`is_locked = "true"`). Judge UIs will prevent submissions until unlocked.
- Active round changes propagate instantly to judge devices and leaderboards.
- A Live indicator shows realtime connectivity on display views.

## CSV export (admin)

From `/admin/leaderboard`, export the displayed rankings (overall or specific round, filtered by gender). File name includes round/gender and date.

## Troubleshooting

Missing Supabase environment variables

- Ensure `.env` contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

Realtime not updating

- Confirm Supabase Realtime is enabled for your project and tables.
- Check browser console for subscription errors.

409 conflicts on settings writes

- Add a unique constraint on `settings.key` (e.g., primary key or unique index). The app uses upsert with `onConflict: 'key'`.

Judges stuck on the wrong round

- Ensure `active_round_id` in `settings` is a string matching the round `id`.
- Use the Competition Editor to set the active round; clients will sync automatically.

## Tech stack

- React 18 + Vite
- TailwindCSS
- Supabase (PostgreSQL + Realtime)
- React Router v6
- Lucide React icons
- Sonner for toasts

## Scripts

- `npm run dev` — Start Vite dev server
- `npm run build` — Production build
- `npm run preview` — Preview production build
- `npm run lint` — ESLint

## License

MIT — use and adapt for your events.

## Credits

Built for smooth, reliable pageant tabulation — with real‑time, multi‑round scoring.
````
