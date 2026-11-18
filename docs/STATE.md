# State of the build

Updated 2026-11-17, after the visual pass and the first two migrations. Branch `v2`.

## Apply order (do these by hand, in this order)

1. `supabase/migrations/20261117000100_additive.sql` (safe with the old frontend live).
   **Applied to production 2026-11-17.**
2. `supabase/migrations/20261117000150_checkins.sql` (safe with the old frontend live).
   **Applied to production 2026-11-17.** 13 editions seeded.
3. Deploy the v2 frontend to Vercel and confirm login works
4. `supabase/migrations/20261117000200_lockdown.sql` (closes the two holes; breaks the old frontend's login, so only after step 3)

Run them in the Supabase SQL editor, one file at a time, each as a whole. The lockdown file checks
its own result and rolls back if anything is still open.

Steps 1 and 2 were applied through the Supabase connection with Justin's go-ahead. Each file was
sent whole inside one transaction that first compared its checksum with the file in the repo.
Row counts before and after: 1,213 profiles, 933 assessments, 728 plans, 11,202 goals, with the
same fingerprints for assessments and goals. Steps 3 and 4 are still to do.

## Shipped

- Phase 1: RPC phone login, server-side profile creation, `is_admin` locked to the server, admin
  stats in the database, per-goal saves, all `console.log` calls removed.
- Phase 2: design tokens with contrast-tested dimension inks, app shell with tabs and top nav,
  linkable routes, dashboard Home, shared components, hand-built SVG wheel, zoom and focus rings
  restored, bundle split (about 125 KB app code; recharts, jspdf, framer-motion, date-fns removed).
- Phase 3: seven-step assessment with flourishing and habit layers, drafts that resume, results
  with reads, care card, attribution, focus areas saved to the plan.
- Phase 4: practice library (50 practices), rule-based Helper, habit editor with autosave, legacy
  goal handling, plan overview and dimension pages.
- Phase 5: new-year start flow (keep, adjust, let go), print view, admin from `admin_stats()`,
  links file.
- Phase 6: opt-in monthly check-ins: schema, engine with Eastern-time gate and lease-based claims,
  signed links, email renderer, check-in page, preferences page, admin editor and counts.
- Phase 7: 189 unit and server tests, copy checker, demo mode, Playwright screens (50) and journeys
  (27), rendered emails in `docs/emails/`.
- Phase 8: database rehearsal and attack suite (96 checks on a local Supabase stack, using the live policies), engine stress
  tests, token and endpoint abuse tests, an independent review with its findings fixed or listed.
  See `docs/PRESSURE_TEST.md`.

- Visual pass (after phase 8): Text and Display cuts split by size, one type scale and spacing
  rhythm, joined five-point scale on phones, results page reordered, checkbox and header fixes.
  Content pass: 17 starter sentences and 2 habit items reworded. See `DECISIONS.md`.

## Blocked on Justin

- Content review: `docs/CONTENT_REVIEW.md` (practice library, habit items, About text, preheaders,
  evergreen note).
- Links: care, groups, serving and giving are filled. Counseling and financial coaching are
  still empty (no page on faithpromise.org for either).
- SendGrid: from address is `noreply@faithpromise.org`. Reply-to is optional and not chosen yet.
- Vercel: set the nine server settings. The Vercel connection cannot read or write this
  project's settings, so Justin pastes them from `.env.vercel.local` (git-ignored, with the two
  generated secrets filled in). The plan is Hobby, so the email lands between 8:00 and 8:59.
- `APP_URL` is `https://growth-plan-sigma.vercel.app`. `growthplan.faithpromise.org` has no DNS
  record.
- Decide on check-in addresses: turn on Supabase email confirmation, or remove "Use a different
  address" (an unverified address could be used to send the email to someone else).
- Live policies checked on 2026-11-17 and the rehearsal rerun against them (96 checks pass). Rerun
  the policy query only if anyone changes policies before the lockdown is applied.

## Next

- Rate-limit `login_email_for_phone` (it is enumerable one phone at a time by design).
- Consider moving the two crons to Vercel Schedules with `timezone: America/New_York` once it
  leaves beta (keep the code gate).
- Optional: store "Not for me" choices in the database so they follow a person across devices.
