// Renders every check-in edition to docs/emails/ in dry-run mode. Nothing is sent.
// Run: npm run emails
// With --check-links it also requests each article URL once and lists any that fail.

import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMessage } from '../server/engine.js';
import { CHECKIN_EDITIONS, EVERGREEN_EDITION } from '../src/content/checkinEditions.js';

const OUT = fileURLToPath(new URL('../docs/emails/', import.meta.url));
const env = {
  APP_URL: 'https://growthplan.faithpromise.org',
  CHECKIN_TOKEN_SECRET: 'dry-run-secret-dry-run-secret-dry-run',
  CHECKIN_FROM_EMAIL: 'checkins@faithpromise.org',
  CHECKIN_FROM_NAME: 'Faith Promise Church',
};

const person = {
  userId: '6f1c2a54-0d8b-4c1e-9a1b-2c3d4e5f6a7b',
  firstName: 'Grace',
  email: 'grace@example.com',
  plan: { year: 2026, focus_dimensions: ['health', 'character'] },
  habits: [
    { dimension: 'health', goal_text: 'Put my phone away thirty minutes before bed on weekdays.' },
    { dimension: 'health', goal_text: 'After work, take a fifteen-minute walk a few times a week.' },
    { dimension: 'character', goal_text: 'Learn one verse once a week.' },
    { dimension: 'faith', goal_text: 'Spend ten minutes in prayer with a short list of people and needs every day.' },
  ],
};

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const index = [];
const editions = [...CHECKIN_EDITIONS.map((e) => ({ ...e, file: e.period })), { ...EVERGREEN_EDITION, period: '2028-01-01', file: 'evergreen' }];
for (const e of editions) {
  for (const [variant, bundle] of [
    ['with-plan', person],
    ['no-plan', { ...person, firstName: 'Nora', plan: null, habits: [] }],
  ]) {
    const { rendered } = buildMessage({ env, edition: e, period: e.period, bundle });
    const name = `${e.file}-${variant}`;
    writeFileSync(join(OUT, `${name}.html`), rendered.html);
    writeFileSync(join(OUT, `${name}.txt`), `Subject: ${rendered.subject}\nPreheader: ${rendered.preheader}\n\n${rendered.text}\n`);
    index.push(`- [${name}](./${name}.html): ${rendered.subject} (${Math.round(Buffer.byteLength(rendered.html) / 1024)} KB)`);
  }
}
writeFileSync(join(OUT, 'README.md'), `# Rendered check-in emails\n\nDry-run renders of every edition, made by \`npm run emails\`. Nothing was sent. Links point at the production address with sample tokens.\n\n${index.join('\n')}\n`);
console.log(`Wrote ${index.length} emails to docs/emails/`);

if (process.argv.includes('--check-links')) {
  const failures = [];
  for (const e of CHECKIN_EDITIONS.slice(0, 12)) {
    try {
      const res = await fetch(e.article_url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(15000) });
      if (!res.ok) failures.push(`${e.period} ${res.status} ${e.article_url}`);
    } catch (err) {
      failures.push(`${e.period} ${err.message} ${e.article_url}`);
    }
  }
  console.log(failures.length ? `Article links that failed:\n${failures.join('\n')}` : 'All article links answered.');
}
