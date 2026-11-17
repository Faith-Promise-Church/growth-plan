# Decisions

Judgment calls made while building v2, newest at the bottom of each section. Each says what was
decided and why, so it can be reversed on purpose.

## 2026-11-17: security and data

- **Policies are found by what they do, not only by name.** The brief gave one policy name on
  `user_profiles` ("Allow phone lookup for login") and described the others. The lockdown
  migration drops any `SELECT` policy with `USING (true)`, any `INSERT` policy with
  `WITH CHECK (true)` or for `anon`, and any admin policy that calls `is_current_user_admin()`, then
  recreates the ones we want by name. A final check raises (and rolls the whole migration back) if
  an open policy, a writable `is_admin`, or an `anon` select on `user_profiles` remains.
- **Owners keep a read policy on their own profile.** Once the open `SELECT` is gone, signed-in
  people still need to read their own row, so the lockdown adds "Users can read own profile (v2)".
- **`anon` loses `SELECT` and `DELETE` on `user_profiles` at the table level too**, not only by
  policy, so a future mistake in a policy cannot reopen the hole.
- **The signup trigger never blocks a signup.** If the phone is already taken it creates the profile
  without the phone; any other failure is logged and skipped, and the app self-heals a missing
  profile at sign-in. The trigger has its own name (`growth_plan_on_auth_user_created`) so it
  cannot replace a trigger that may already exist.
- **Self-heal uses `ON CONFLICT DO NOTHING`** (`ignoreDuplicates`). A merge upsert would try to
  `UPDATE id`, which the column grants rightly refuse.
- **Goal ids are created in the browser** (`crypto.randomUUID()`) so a retried save updates the same
  row instead of creating a second one, and a double tap cannot duplicate a habit.
- **Removing a v1 required goal clears its text instead of deleting the row**, to keep every
  existing row as the brief requires. A cleared required goal shows again as a suggestion.
- **Phone lookup stays enumerable by design.** `login_email_for_phone` must answer for `anon` for
  phone login to work, so anyone can still turn a known phone number into an email one call at a
  time. It no longer allows a bulk download. Rate limiting it needs Supabase's own controls or an
  edge function; listed in the PR as a follow-up.

## 2026-11-17: stack and dependencies

- **Removed `framer-motion` and `date-fns` as well as `recharts` and `jspdf`.** The brief allows
  removing dependencies and forbids adding them. Motion is now plain CSS (and respects
  `prefers-reduced-motion`); dates use `Intl.DateTimeFormat`. The main bundle went from one
  1.1 MB chunk to about 125 KB of app code plus separate React and Supabase chunks.
- **`@playwright/test` instead of the bare `playwright` package.** Same project, and it includes the
  test runner the screenshots and journeys need.
- **No `@testing-library/react` tests.** It needs a DOM library (`jsdom` or `happy-dom`) that is not
  on the allowed list. Component behavior is covered by Playwright in demo mode instead, and all
  logic lives in pure functions with Vitest tests.
- **Server functions use the Web `Request`/`Response` signature** (`export function GET(request)`),
  which Vercel's Node runtime supports. It keeps handlers testable without a server.
- **Crons stay in the `crons` array of `vercel.json`.** Vercel now calls Cron Jobs a legacy feature
  and offers Schedules (public beta) with a per-schedule timezone. Because the code gate works
  either way and Schedules is still beta, the two UTC crons stay. The PR describes the switch
  (`"schedules"` with `"timezone": "America/New_York"` and `"requestMethod": "GET"`), and notes that
  keeping both would run the route twice per occurrence.

## 2026-11-17: assessment

- **The 11 Harvard mappings in the brief are correct** (checked against
  hfh.fas.harvard.edu/measuring-flourishing on 2026-11-17). All 11 are reworded from the original,
  including items 5, 7, 8 and 9, so every one is tagged "adapted". Harvard's scale is 0 to 10 and
  ours is 1 to 10, which is one more reason never to compare scores.
- **Flourishing scores use the v1 function verbatim** (`legacyCalculateDimensionScore`), so new and
  old scores are produced the same way.
- **The draft lives in `localStorage` per user.** A step cannot be skipped: visiting a later step
  sends you to the first unfinished one.
- **Results compare with the assessment just before the one shown**, not always the latest pair.

## 2026-11-17: Helper

- **Order inside the Helper:** core practices with a habit answer of 0 or 1, then core at 2, then
  core at 3 or 4 (offered as a stretch, with "Add my current rhythm"), then the rest of the library.
  The brief's "other practices" was read as "everything else", which includes steady core ones.
- **"Faithful in a hard season" leads with support practices** (a group, talking with a pastor,
  counseling, financial coaching, an accountability partner), sized small. Each dimension has at
  least one support practice so this works everywhere.
- **"Add my current rhythm" uses the `steady` starter**, which describes a rhythm someone at 3 or 4
  already keeps.
- **"Not for me" is remembered per person and dimension in `localStorage`**, with "Show hidden ideas"
  to undo it. No schema change.
- **A v1 assessment (no habit answers) uses the general rules with a read-free lead line** and small
  starters, and never shows a habit score of zero.

## 2026-11-17: plan

- **A new habit is not saved until "Add to my plan".** After that, and for existing habits, every
  edit autosaves after 600 ms and on close.
- **Cadence is stored as a key** (`daily`, `weekdays`, `few-weekly`, `weekly`, `monthly`) or as
  `other:<their words>`. The full sentence is always in `goal_text`, so v1 screens keep working.
- **Plan year is the current year in New York time.** Plans exist for 2026 to 2045 (the existing
  check constraint).
- **Adding a suggestion that matches a blank v1 required goal fills that row** instead of creating a
  second one.

## 2026-11-17: check-ins

- **People can send check-ins to a different address than their login email.** The address lives in
  `email_preferences.email`. Changing `user_profiles.email` would break phone login, which turns a
  phone into that email.
- **Opt-in and opt-out times are set by a trigger**, never by the client.
- **Sending uses a claim with a lease** (`claim_checkin_sends`, `FOR UPDATE SKIP LOCKED`, 10 minute
  lease) on top of the `(period, user_id)` unique key. Two runs at the same moment cannot both send
  to one person, and a run that dies leaves its rows to the next run once the lease ends.
- **A bad address (any 4xx except 429) is not retried**; the row is marked failed with three
  attempts. 429, 5xx and timeouts retry on later runs, up to three attempts in all.
- **Resume runs only for rows already queued.** Someone who opts in after the send day gets next
  month's email, not a late one.
- **The check-in token does not return last month's answers.** It returns first name and active habit
  sentences, and the submit response includes the computed suggestions. Signed-in people also see
  their saved answers for the month.
- **The unsubscribe link in the email goes to `/email/preferences?token=…`**, a page with a button.
  `GET /api/email/unsubscribe` redirects there and changes nothing. One-click unsubscribe from mail
  apps uses `POST` to the same URL.
- **The token is removed from the address bar** as soon as the check-in or preferences page reads it,
  and the site sends `Referrer-Policy: strict-origin-when-cross-origin`.
- **The admin preview is not de-duplicated in the database.** If Vercel delivers the Thursday cron
  twice, admins could get two previews. Only admins are affected, so no table was added for it.

## 2026-11-17: copy and design

- **The "About this area" text was rewritten** from the v1 slides to meet the copy rules (shorter
  sentences, no "actually" or "intentionally", no quoted jargon such as "scarcity tunnel"). It is in
  `docs/CONTENT_REVIEW.md`.
- **`--{dim}-on` is tested at the large-text level (3:1).** For Faith and Purpose neither white nor
  dark text reaches 4.5:1 on the full color, and the brief limits full-bleed color to large display
  type. Selected states use the `--{dim}-ink` fill with white text, which passes 4.5:1.
- **Primary buttons use Character teal (`#326565`) with white text.** The header gradient teal
  (`#2A9D8F`) fails 4.5:1 with white.
