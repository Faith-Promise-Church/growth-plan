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

## 2026-11-17: after the independent review

- **A send that may have reached SendGrid is never retried automatically.** `send_started_at` is set
  just before the request; only a clear "no" from SendGrid (an error status) clears it. If recording
  "sent" fails afterward, the row stays as it is and the summary counts it as unconfirmed.
- **Timeouts are still retried**, because the brief asks for timeouts to be retried up to three times.
  A 15-second timeout before SendGrid answers almost always means it was not accepted, but it is
  possible for one person to get a second email in that rare case. Reverse by making timeouts
  permanent in `server/sendgrid.js` (`retryable: false` for `AbortError`).
- **A missed 8 AM run is made up within three days.** If a later call finds nothing queued for the
  month, it queues and sends then.
- **The lockdown keeps owner policies that also mention the admin check**, adds owner read policies as
  a safety net, and refuses to finish if owner write policies are missing.
- **The signup trigger function is `growth_plan_handle_new_user`**, so it cannot replace a
  `handle_new_user` that may already exist.
- **The check-in token response is trimmed** to first name, focus areas and each habit's id, area and
  sentence. Signed-in sessions also get the plan year and their saved answers.
- **Habit autosaves run one at a time, in order**, and flush only when the editor closes or unmounts.

## 2026-11-17: visual pass

- **Two cuts of the typeface, by size.** The Typekit kit already carries Neue Haas Grotesk Text as
  well as Display. Display was being used for everything, and at 13 to 17px its letters and words
  run together. Body copy, labels and buttons now use Text (`--font-text`, weight 400 for reading,
  700 for emphasis). Page titles, card titles and large numbers stay in Display (`--font-display`).
  The Typekit link is unchanged. Reverse by pointing `--font-text` at the Display family.
- **Tracking only on large type.** The blanket `-0.02em` on every heading is gone. 32px and up gets
  `-0.015em`, 24px gets `-0.01em`, 20px and under is left as drawn. Display titles also get a
  little word space (`--word-display`) because the bold cut has a narrow space.
- **One type scale with named roles** (in `variables.css`): 13 caption, 15 secondary, 17 body,
  20 card title, 24 lead title, 32 page title (40 from 768px). Each size has a set line height.
- **Card rhythm.** Cards use a 16px gap, and a title with the line under it sits 8px apart so the
  pair reads as one unit. Padding is 20px on phones and 24px from 768px.
- **The five-point "how steady" scale is one joined list on phones**, with a radio mark and
  left-aligned labels, instead of five separate full-width buttons. It reads as one choice and
  each habit takes less room. From 560px it is one row of five segments.
- **Question legends are floated** so the space under a legend is the same in every fieldset
  (a legend ignores grid and flex gaps).
- **Results page order on phones:** the wheel now comes first, each card explains its own read in
  one line, and the attribution moved to the end. The separate "What the reads mean" card was
  removed because the cards now say it. The meanings live in `READS` in `src/lib/scoring.js`.
- **Checkbox labels hang beside the box**, so a wrapped line stays lined up, and the real input
  sits on top of the drawn box.
- **Plan cards with no habits say "Add a habit"** instead of "Edit".
- **Page header actions sit after the title and lead**, so a button no longer lands between them
  on a phone.

## 2026-11-17: content pass

- **Starter sentences no longer repeat their own cadence.** Seventeen starters read badly once the
  cadence phrase was added ("each morning every day", "before the month begins once a month",
  "each week every day"). The `what` text was reworded so the built sentence reads cleanly. One
  cadence changed with it: the Bible reading plan stretch is now weekly (the talk with a friend).
- **Two habit items were reworded for consistency:** "Spending unhurried time in prayer" (the others
  all start with a verb) and "thirty minutes" (numbers are spelled out everywhere else).
- **Fasting carries a health line** ("Check with your doctor first if you have a health concern").
- **Support practices use their own size labels** in the Helper ("A first step", "A steady rhythm",
  "A next step"), so more counseling is never called "A stretch".
- **Three preheaders were replaced** (January, October, November) because each repeated its own
  subject line or article blurb. The check-in seed in the migration was regenerated.
- **Links filled from the live site navigation:** care, groups, serving and giving. Counseling and
  financial coaching stay empty: faithpromise.org has no page for either, and the care page says
  Stephen Ministers are not licensed counselors.
- **`APP_URL` is `https://growth-plan-sigma.vercel.app`.** `growthplan.faithpromise.org` has no DNS
  record. If that address is added later, change `APP_URL` in Vercel at the same time.

## 2026-11-17: launch

- **The first two migrations were applied through the Supabase connection**, not the SQL editor,
  with Justin's go-ahead. Each ran as one transaction that refused to start unless the SQL sent
  matched the checksum of the file in the repo.
- **The lockdown now also removes the extra default grants on the check-in tables.** After the
  check-ins migration, `authenticated` still held DELETE, TRUNCATE, REFERENCES and TRIGGER on
  `email_preferences`, `checkins` and `checkin_content` from Supabase's default privileges. Row
  level security blocks deletes, and the API has no way to truncate, so nothing was exposed, but
  the grants were wider than intended. The lockdown revokes them and checks that they are gone.
  This statement was added after the local rehearsal and has not been through it.

## 2026-11-17: plan history and sharing

- **Earlier years are reachable and kept as a record.** The Plan page shows a year switcher when
  there is more than one plan, and the account menu has "Plan history" (`/plans`). A plan from an
  earlier year opens read-only: habits, print and share, with no Helper and no edit buttons.
  "Make changes" on an area page reopens it for that visit. Nothing in the database marks a plan
  as closed, so this can be reversed by removing the `isPast` checks.
- **Sharing is the person's choice, area by area.** "Share" on the Plan page builds a plain-text
  summary and hands it to the phone's share sheet (or copies it where there is none). Habits
  only. Scores are added only when the person ticks "Include my scores".
- **A private link is a row in `plan_shares`, read through a server function.** The link carries
  the row id, which the database generates. Signed-out visitors never read a table directly:
  `/api/share/plan` uses the service role and returns first name, year and the habit sentences
  for the chosen areas. It never returns scores, the email, ids or paused habits. A link lasts 30
  days (the table allows at most 90) and the owner can stop it. An unknown, stopped or expired
  link all get the same answer.
- **The client cannot extend or redirect a link.** Column grants allow inserting only
  `user_id`, `growth_plan_id`, `dimensions` and `expires_at`, and updating only `revoked_at`.
- **No sharing between accounts inside the app.** That would need a way to look other people up,
  which the lockdown removed on purpose.
- **The link section hides itself if the table is missing**, so the app can be deployed before
  `20261118000100_plan_shares.sql` is applied.

