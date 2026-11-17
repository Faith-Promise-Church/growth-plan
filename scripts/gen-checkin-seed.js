// Writes the checkin_content seed into the check-in migration from
// src/content/checkinEditions.js. Run: node scripts/gen-checkin-seed.js
// With --check it exits non-zero if the migration is out of date (used by tests).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CHECKIN_EDITIONS, CHECKIN_CONTENT_FIELDS } from '../src/content/checkinEditions.js';

const MIGRATION = fileURLToPath(new URL('../supabase/migrations/20261117000150_checkins.sql', import.meta.url));

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function buildSeed() {
  const columns = ['period', ...CHECKIN_CONTENT_FIELDS];
  const rows = CHECKIN_EDITIONS.map(
    (e) => `  (${[`date ${sqlString(e.period)}`, ...CHECKIN_CONTENT_FIELDS.map((f) => sqlString(e[f]))].join(', ')})`,
  );
  return [
    '-- BEGIN SEED',
    `insert into public.checkin_content (${columns.join(', ')})`,
    'values',
    rows.join(',\n'),
    'on conflict (period) do nothing;',
    '-- END SEED',
  ].join('\n');
}

export function applySeed(sql) {
  return sql.replace(/-- BEGIN SEED[\s\S]*?-- END SEED/, buildSeed());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const current = readFileSync(MIGRATION, 'utf8');
  const next = applySeed(current);
  if (process.argv.includes('--check')) {
    if (current !== next) {
      console.error('checkin seed in the migration is out of date. Run: node scripts/gen-checkin-seed.js');
      process.exit(1);
    }
  } else {
    writeFileSync(MIGRATION, next);
  }
}
