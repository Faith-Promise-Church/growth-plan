# State of the build

Updated 2026-11-17, end of the v2 build session. Branch `v2`.

## Apply order (do these by hand, in this order)

1. `supabase/migrations/20261117000100_additive.sql` (safe with the old frontend live)
2. `supabase/migrations/20261117000150_checkins.sql` (safe with the old frontend live)
3. Deploy the v2 frontend to Vercel and confirm login works
4. `supabase/migrations/20261117000200_lockdown.sql` (closes the two holes; breaks the old frontend's login, so only after step 3)

Run them in the Supabase SQL editor, one file at a time, each as a whole. The lockdown file checks
its own result and rolls back if anything is still open.

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
- Phase 7: 187 unit and server tests, copy checker, demo mode, Playwright screens (50) and journeys
  (26), rendered emails in `docs/emails/`.
- Phase 8: database rehearsal and attack suite (94 checks on a local Supabase stack), engine stress
  tests, token and endpoint abuse tests, an independent review. See `docs/PRESSURE_TEST.md`.

## Blocked on Justin

- Content review: `docs/CONTENT_REVIEW.md` (practice library, habit items, About text, preheaders,
  evergreen note).
- Links in `src/content/links.js` (all empty, so hidden).
- SendGrid: authenticate the sending domain, choose from and reply-to addresses.
- Vercel: set the server environment variables in `.env.example`; confirm the plan (Hobby fires
  crons any time within the hour).
- Six article links could not be confirmed from the build workspace (403 or 404).

## Next

- Rate-limit `login_email_for_phone` (it is enumerable one phone at a time by design).
- Consider moving the two crons to Vercel Schedules with `timezone: America/New_York` once it
  leaves beta (keep the code gate).
- Optional: store "Not for me" choices in the database so they follow a person across devices.
