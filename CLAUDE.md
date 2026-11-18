# Growth Plan Builder (Faith Promise Church)

A phone-first web app: a flourishing assessment across seven dimensions (Faith, Relationships,
Finances, Health, Purpose, Character, Contentment), a yearly growth plan built from habits, and an
opt-in monthly check-in email.

## Stack

- Vite 7, React 19, react-router 7, plain CSS, JavaScript (no TypeScript, no Tailwind, no
  component library).
- Supabase (Postgres, Auth, RLS) through `@supabase/supabase-js`.
- Vercel: static app plus Node functions in `/api` (Web `Request`/`Response` handlers).
- SendGrid v3 Mail Send, called with plain `fetch` from the server only.

## Layout

| Path | What |
|---|---|
| `src/content/` | All words and data people read: dimensions, assessment items, practice library, links, check-in editions |
| `src/lib/` | Pure logic with unit tests: scoring, Helper, habits, check-in adjustments, schedule gate, time |
| `src/data/` | `client.js` (real or demo client), `api.js` (every database call), `demoClient.js` + `demoSeed.js` |
| `src/components/ui/` | Shared components (Button, Card, PageHeader, Stepper, ScaleInput, FrequencyInput, DimensionTile, Meter, Dialog, Toast, EmptyState, Skeleton) |
| `src/components/app/` | App pieces: AppShell, Wheel (hand-built SVG), HabitEditor, HelperPanel, CheckinOptIn, SharePlan |
| `src/pages/` | Routes |
| `server/` | Server-only code: tokens, engine, email render, SendGrid, handlers, db adapter |
| `api/` | Thin Vercel function files that call `server/live.js` |
| `supabase/migrations/` | Additive and lockdown migrations. Never run against production from here |
| `supabase/tests/` | Local rehearsal: baseline schema, seed, attack and rehearsal scripts |
| `tests/` | Vitest unit and server tests |
| `e2e/` | Playwright (demo mode) |

## Commands

```bash
npm install
npm run dev                 # needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev:demo            # VITE_DEMO=1, in-memory data, no network
npm run lint
npm run build
npm test                    # copy check + unit and server tests
npm run test:db             # local Supabase (Docker) attack suite and migration rehearsal
npm run test:e2e            # Playwright in demo mode (screens, journeys, axe)
npm run emails              # render all editions to docs/emails/ (dry run, no SendGrid)
node scripts/gen-checkin-seed.js   # regenerate the checkin_content seed in the migration
```

## Ground rules

1. The app is live with real people (about 1,200 profiles, 930 assessments, 730 plans, 11,200
   goals). Nothing may be lost, rewritten or made unreadable. Every schema change is additive.
2. Never touch production: no SQL against the live project, no deploys, no real accounts.
   Migrations go in `supabase/migrations/` and Justin applies them.
3. Keep exactly as they are: the color hex values in `src/styles/variables.css`, the Neue Haas
   Grotesk Typekit link in `index.html`, and every file in `public/assets/logos/`.
4. No new runtime dependencies. Dev dependencies allowed: vitest, @testing-library/react,
   playwright, @axe-core/playwright, Supabase CLI.
5. Server-only secrets never use the `VITE_` prefix.
6. Layer 1 of the assessment (the 20 flourishing questions) never changes: wording, order, 1 to 10
   scale, columns, averaging.

## Conventions

- Every database call goes through `src/data/api.js`.
- Goals are saved one at a time (upsert by id, delete by id). Never delete-and-reinsert.
- Copy rules (enforced by `scripts/check-copy.js`): plain pastoral voice, about 9th-grade reading
  level, no em dashes, no "really/truly/simply/just/quietly", no leading zeroes, sentence-case
  buttons, no hype. Never shame a low score.
- Dimension color is an accent. Text in a dimension color uses `--{dim}-ink`. Text on the full
  dimension color uses `--{dim}-on` and only at large display sizes.
- One primary button per screen.
- Record judgment calls in `DECISIONS.md` and keep `docs/STATE.md` current.
