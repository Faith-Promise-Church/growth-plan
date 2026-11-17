# Growth Plan Builder

Faith Promise Church's Growth Plan Builder. A person takes a flourishing assessment across seven
areas of life (Faith, Relationships, Finances, Health, Purpose, Character, Contentment), chooses
two or three focus areas, and builds a plan of small habits for the year. People who opt in get a
short check-in email on the first Monday of each month.

## Run it

```bash
npm install
cp .env.example .env.local     # add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

No database handy? `npm run dev:demo` runs the whole app on in-memory demo data. Log in with
865-555-0101, 865-555-0102, 865-555-0103 or 865-555-0104 (an admin) and the password `Demo1234`.

The check-in endpoints in `/api` run on Vercel (`vercel dev` locally) and need the server-only
variables in `.env.example`.

## Check it

```bash
npm run lint
npm run build
npm test            # copy rules, unit tests, server and email tests
npm run test:e2e    # Playwright on the demo build: screens, journeys, accessibility
npm run test:db     # needs `npx supabase start` (Docker): migration rehearsal and attack suite
npm run emails      # renders every check-in edition to docs/emails/ without sending
```

## Where things are

- `src/content/`: every word and list people read (assessment, practices, links, emails)
- `src/lib/`: the logic, as pure functions with tests (scoring, Helper, schedule, check-ins)
- `src/pages/`, `src/components/`: the app
- `server/`, `api/`: check-in email engine and endpoints
- `supabase/migrations/`: database changes, applied by hand (see `docs/STATE.md` for the order)
- `docs/`: state of the build, content for review, pressure test report, screenshots, emails

`CLAUDE.md` has the conventions and ground rules. `DECISIONS.md` has the judgment calls.
