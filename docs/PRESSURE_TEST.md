# Pressure test report

Run on 2026-11-17 in the build workspace (Linux, Node 22, Docker 29, Supabase CLI 3.2.0 local
stack with Postgres 17, Chromium from Playwright 1.65). Every test below is in the repo and can be
rerun. "Passed" means it ran and passed here. Nothing ran against the live Supabase project or
SendGrid.

| Area | How to rerun | Result |
|---|---|---|
| Database attack suite and migration rehearsal | `npx supabase start`, then `npm run test:db` | 95 checks, all passed (`supabase/tests/last-run.json`) |
| Unit, engine, endpoint and email tests | `npm test` | 189 tests, all passed, plus the copy check |
| App in rough conditions, screens, accessibility | `npm run test:e2e` | 77 tests, all passed |
| Rendered emails | `npm run emails` | 28 renders in `docs/emails/` |

## 1. Database attack suite: passed

`supabase/tests/run-db-tests.js` on a local Supabase stack, after rebuilding the live schema from
`supabase/tests/baseline.sql` and applying the migrations in order. Proven as `anon` and as an
ordinary signed-in user (through the real REST API with real sessions):

- Passed: `anon` reads no rows of `user_profiles` (by filter or by id), and nothing from any other table.
- Passed: the phone lookup returns one email for one exact phone, and nothing for partial numbers,
  `%`, `865%`, `_65-…`, empty, whitespace, a trailing space, a quote-injection string or null.
  Same for `phone_is_registered`.
- Passed: a user cannot read, change, delete, take over (upsert onto another person's goal id) or add
  to another person's assessments, plans, goals, check-ins or email preferences, including by
  guessing ids. Row checksums of the target person's goals are identical before and after.
- Passed: a user cannot set `is_admin` by update, upsert or insert (including an auth user with no
  profile row trying to create one as admin). They can still edit their own name.
- Passed: a non-admin cannot call `admin_stats()` or `admin_checkin_stats()`, read or edit
  `checkin_content`, read `checkin_sends`, or run the send queue functions. `anon` cannot call
  `is_current_user_admin()`.

## 2. Migration rehearsal on realistic data: passed

Seeded at production scale with `supabase/tests/seed-production-scale.sql`: 1,200 profiles, 930
version 1 assessments, 730 plans, 11,200 goals, with blank required goals, 5,000-character goal
text, emoji, text that looks like HTML and SQL, 20 plans with no goals, 20 people with six
assessments, and 16 auth users with no profile row.

- Passed: a checksum (row count plus md5 of every row) of every pre-existing column of
  `user_profiles`, `assessments`, `growth_plans` and `goals` is identical before and after the
  additive migrations, and again before and after the lockdown. Assessments and plans are
  byte-identical from seed to the end. Existing rows read as `version = 1` and `status = 'active'`.
- Passed: after the additive migrations only, the old frontend's own queries work: anon phone lookup,
  load plan, save goals by delete-then-insert, the admin page's assessment read, and v1 signup (the
  new trigger creates the full profile; a second signup with a phone already in use still succeeds).
- Passed: after the lockdown, the old open lookup returns nothing, and the new frontend works: RPC
  login, own profile read, per-goal upsert and delete, focus areas, version 2 assessment, opt-in and
  opt-out (times set by the server), check-ins (one per month, answers limited to 0 to 4),
  self-heal of a missing profile (never as admin, never overwriting), `admin_stats()` counting past
  the 1,000-row cap, and admin editing of check-in content.
- Passed: an owner policy written as "owner OR admin" survives the lockdown (added after the review,
  see section 8).

## 3. Email engine under stress: passed

`tests/engine.test.js` (fake clock, fake SendGrid) and section 6 of the database suite (real claim
function):

- Passed: every cron call from December 1, 2026 to January 31, 2028 at 12:00 and 13:00 UTC opens
  exactly one send window per month, on the first Monday at 8 AM Eastern, using 13:00 UTC in winter
  and 12:00 UTC in summer across the March 14 and November 7, 2027 changes. Previews fire only on the
  Thursday before (`tests/schedule.test.js`).
- Passed: two runs in a row, and three runs at the same moment, send nobody a second email, both
  with the fake and against the real database (300 people, three concurrent runs, 300 sends, 300
  unique).
- Passed: a run stopped by its time budget halfway is finished by the next invocation. Rows claimed by
  a run that died are picked up after the lease.
- Passed: SendGrid 429, 500, a timeout and a rejected address. The run completes, every failure is
  recorded, retries stop at three attempts, and the bad address is not retried.
- Passed: a database error for one batch does not stop the run.
- Passed: 5,000 opted-in people finish well inside the time limit (about 1 second with the fake).
- Passed: someone who opts out after being queued and before being sent gets nothing.
- Passed (added after review): an email that was sent but whose result could not be recorded is never
  sent again, and a missed 8 AM run is made up later the same day.

## 4. Link, token and endpoint abuse: passed

`tests/tokens.test.js`, `tests/handlers.test.js`, `tests/emails.test.js`:

- Passed: tampered, expired, wrong-purpose and junk tokens are rejected; an unsubscribe token cannot
  be used to check in, and a check-in token cannot unsubscribe.
- Passed: a valid token for one person submitted with another person's goal ids is rejected and saves
  nothing.
- Passed: a GET to the unsubscribe link only redirects to a page with a button and changes nothing.
  The check-in and preferences pages change nothing until a button is pressed (Playwright).
- Passed: the cron endpoint refuses a missing or wrong secret; the admin test endpoint refuses a
  signed-out caller and a non-admin.
- Passed: names, habits, notes and content with HTML, script tags, quotes and line breaks are
  escaped in the email; `javascript:` links are dropped; the subject and headers cannot be split.
  Pages render all text through React, which escapes it.
- Passed: oversized payloads are refused with 413, including when `Content-Length` lies.

## 5. Every rendered email: passed, with six article links not confirmed

All 13 editions plus the evergreen edition, each with no plan, a plan with 0 habits, 1, 5 and 12
habits, and a long accented name (84 renders): each has a plain-text part, a working unsubscribe
link, only absolute `https` links, no `{{`, `undefined`, `null` or `NaN`, and HTML under 100 KB
(about 9 KB). Pastor Zac's notes are all 35 to 60 words.

Article links, requested once each from the build workspace (`node scripts/render-emails.js --check-links`):

| Edition | Result |
|---|---|
| February, June, July, August, September, November | answered |
| December (Desiring God) | 403 |
| January (Baptist Press) | 403 |
| March (The Gospel Coalition) | 403 |
| April (Jesus Film Project) | **404** |
| May (Desiring God) | 403 |
| October (The Gospel Coalition) | 403 |

The 403s are most likely those sites refusing automated requests from a data center; open them in a
browser to confirm. The April link returned 404 and probably needs a new URL. These do not fail the
build, as the brief asked.

## 6. The app in rough conditions: passed

Playwright on the demo build (`e2e/journeys.spec.js`, `e2e/screens.spec.js`):

- Passed at 320, 390, 768 and 1440: a new person from signup through the assessment, focus areas,
  adding a habit from the Helper, opt-in and a check-in; a returning person with a version 1
  assessment and a legacy plan (blank required goals hidden, written ones shown, adding a suggestion
  fills the blank row instead of duplicating it); the new-year start flow (keep, adjust, let go,
  copy, focus areas).
- Passed: reload in the middle of the assessment resumes with every answer; no answer is preselected
  and steps cannot be skipped.
- Passed: going offline during a habit autosave shows the retry banner and keeps the text; the final
  assessment save keeps the draft and retries.
- Passed: double-tapping submit saves one assessment, one plan and one habit.
- Passed: the browser Back button works through the assessment and between pages.
- Passed: the assessment can be completed with the keyboard alone.
- Passed: axe finds no serious or critical violations on any of the 25 routes at 390 wide; no route
  scrolls sideways and no tap target is under 44px at 390 or 1440.
- Passed: a 60-character name, a 500-character habit and a plan with 40 habits do not overflow at 320
  or 390, and the print page runs onto more than one Letter page with sections kept whole.
- Passed: on a slow network (2.5 seconds per request) loading skeletons show in place of blank screens.
- Passed (added after review): typing during an autosave settles without a save loop, and the last
  text wins.

## 7. Logic under every input: passed

- Passed: for every combination of flourishing (none, 1, 5, 7.4, 7.5, 10), habit score (none, 1, 6.4,
  6.5, 10), every combination of habit answers in each dimension, and every amount of the library
  already in the plan, the Helper returns at most three suggestions, never one already in the plan,
  never changes the goals it is given, and always offers something while the library has anything
  left (`tests/helper.test.js`).
- Passed: for 10,000 random answer sets, the new flourishing scores equal the old
  `calculateDimensionScore` exactly (`tests/scoring.test.js`).
- Passed: `getCheckinAdjustments` never suggests an action for a paused or done habit
  (`tests/logic.test.js`).

## 8. A fresh pair of eyes

A separate reviewer that had seen none of this work read the full diff and looked for security
holes, data loss and broken ground rules. Its findings and what happened to each:

| # | Finding | Result |
|---|---|---|
| 1 | The habit editor's flush-on-unmount effect re-ran on every parent render, which could start a back-to-back save loop, and saves could land out of order | **Failed, then fixed.** The flush runs only on unmount, saves run in order through a queue, and an e2e test proves typing during a save settles with the last text |
| 2 | If SendGrid accepted an email but recording "sent" failed, the row went back to the retry queue and the person could get a second email | **Failed, then fixed.** New `checkin_sends.send_started_at` is set before calling SendGrid; rows with it set are never claimed again unless SendGrid said no. Engine test added. Timeouts are still retried as the brief asks; see `DECISIONS.md` |
| 3 | The lockdown dropped any admin policy that mentioned `is_current_user_admin()`, which would also drop an owner policy written as "owner OR admin" and lock people out of their own data | **Failed, then fixed.** It now drops only pure admin `SELECT` policies, adds owner read policies as a safety net, and checks that owner write policies remain. The rehearsal baseline now includes an "owner OR admin" policy |
| 4 | `login_email_for_phone` can be called repeatedly to turn phone numbers into emails | **Not fixed.** Phone login needs this lookup for signed-out visitors. It no longer allows a bulk download. Listed in the PR as a follow-up (rate limiting) |
| 5 | People can send check-ins to an address they have not proved they own | **Not fixed.** Decision for Justin in the PR: turn on Supabase email confirmation, or remove the "use a different address" option |
| 6 | `handle_new_user` could overwrite a function of the same name already in the live project | **Fixed.** Renamed `growth_plan_handle_new_user` |
| 7 | The check-in token returned more than first name and habit sentences | **Fixed.** It now returns only first name, focus areas and each habit's id, area and sentence |
| 8 | If the 8 AM run never happened, nobody got that month's email | **Fixed.** A later call within three days starts the month if nothing was queued. Test added |
| 9 | The cron route changes data on a GET; previews are not de-duplicated | **Not changed.** Vercel calls cron routes with GET, and the route needs the secret. Duplicate previews affect admins only. Both noted in `DECISIONS.md` |
| 10 | "Make it smaller" and "Stretch it" replace the habit sentence without an undo | **Not changed.** The new sentence is shown before the button, and the person must sign in to apply it. Noted for review |
| 11 | Some new files were not committed when the review ran | **Fixed.** Everything is committed |

## Not run

- **Article links from a real browser.** The build workspace could only make server-side requests,
  which six sites refused. See section 5.
- **A production schema dump.** The rehearsal uses the schema described in the brief. The live
  policy names could differ; the lockdown finds policies by what they do and checks itself, and the
  PR asks for a `pg_policies` dump before applying it.
