// Writes docs/CONTENT_REVIEW.md from the content files, so the review copy always matches the app.
// Run: node scripts/content-review.js

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DIMENSION_ORDER, DIMENSIONS } from '../src/content/dimensions.js';
import { FLOURISHING_QUESTIONS, HABIT_ITEMS, HABIT_STEM, FREQUENCY_OPTIONS, HARVARD_ATTRIBUTION } from '../src/content/assessment.js';
import { PRACTICES } from '../src/content/practices.js';
import { CHECKIN_EDITIONS, EVERGREEN_EDITION } from '../src/content/checkinEditions.js';
import { starterSentence } from '../src/lib/habits.js';
import { monthYearLabel } from '../src/lib/time.js';

const out = [];
const w = (s = '') => out.push(s);

w('# Content for review');
w();
w('Everything below is a draft for Justin and Pastor Zac to review. It is generated from the files in');
w('`src/content/` by `node scripts/content-review.js`, so edit those files, not this one.');
w();
w('Where to change things:');
w();
w('| What | File |');
w('|---|---|');
w('| Habit items and the attribution | `src/content/assessment.js` |');
w('| Practice library (Helper suggestions) | `src/content/practices.js` |');
w('| "About this area" text | `src/content/dimensions.js` |');
w('| Check-in emails (seed) | `src/content/checkinEditions.js`, then `node scripts/gen-checkin-seed.js`. After the migration is applied, edit editions in Admin, Check-ins |');
w('| Outside links (care, groups, serving, giving, counseling, coaching) | `src/content/links.js` |');
w();
w('## Things to decide');
w();
w('- **Links.** Every link in `src/content/links.js` is empty, so the app hides them. The care link matters most: it appears on the results page when someone answers 3 or below on basic needs, emotional resilience or happiness, and in the Helper for "Faithful in a hard season".');
w('- **Article links.** All twelve are confirmed live (see `docs/PRESSURE_TEST.md`, section 5).');
w('- **October note** mentions "the Winning Team". The copy rules ask for no church jargon; it is seeded as written because the brief said not to rewrite the notes.');
w('- **Evergreen edition.** Used only when a month has no content. Its Pastor Zac note is new and needs his review.');
w();
w('## Assessment');
w();
w('### Attribution (assessment intro and results page)');
w();
w(`> ${HARVARD_ATTRIBUTION}`);
w();
w('### Layer 1: Flourishing (unchanged from v1)');
w();
w('| Column | Question | Source |');
w('|---|---|---|');
for (const d of DIMENSION_ORDER) {
  for (const q of FLOURISHING_QUESTIONS[d]) {
    const src = q.source.type === 'harvard' ? `Harvard item ${q.source.item}, adapted. ${q.source.note}` : 'Faith Promise';
    w(`| \`${q.column}\` | ${q.text} | ${src} |`);
  }
}
w();
w('### Layer 2: Habits (new)');
w();
w(`Stem: **${HABIT_STEM}**`);
w();
w(`Answers (stored 0 to 4): ${FREQUENCY_OPTIONS.map((o) => `${o.value} ${o.label}`).join(', ')}.`);
w();
w('| Dimension | Item | Related practice |');
w('|---|---|---|');
for (const d of DIMENSION_ORDER) for (const h of HABIT_ITEMS[d]) w(`| ${DIMENSIONS[d].name} | ${h.text} | \`${h.practice}\` |`);
w();
w('## About this area (replaces the three v1 interstitial slides)');
w();
for (const d of DIMENSION_ORDER) {
  w(`**${DIMENSIONS[d].name}**`);
  w();
  w(`- What it is: ${DIMENSIONS[d].definition}`);
  w(`- Why it matters: ${DIMENSIONS[d].whyItMatters}`);
  w(`- How to grow: ${DIMENSIONS[d].growthFocus}`);
  w();
}
w('## Practice library');
w();
w('Core practices (the 15 v1 required goals) show first in the Helper with "Recommended by Faith Promise". Support practices lead the Helper when someone is "Faithful in a hard season".');
w();
for (const d of DIMENSION_ORDER) {
  w(`### ${DIMENSIONS[d].name}`);
  w();
  for (const p of PRACTICES.filter((x) => x.dimension === d)) {
    const tags = [p.core && 'core', p.support && 'support', p.habitItem && `habit item \`${p.habitItem}\``].filter(Boolean).join(', ');
    w(`**${p.name}** (\`${p.key}\`${tags ? `; ${tags}` : ''})`);
    w();
    w(`- Why: ${p.why}`);
    w(`- Small: ${starterSentence(p, 'small')}`);
    w(`- Steady: ${starterSentence(p, 'steady')}`);
    w(`- Stretch: ${starterSentence(p, 'stretch')}`);
    w();
  }
}
w('## Monthly check-in editions');
w();
w("Pastor Zac's notes are seeded exactly as written in the brief. The December edition is used for December 2026 and December 2027. Preheaders are new.");
w();
for (const e of [...CHECKIN_EDITIONS, { ...EVERGREEN_EDITION, period: null }]) {
  w(`### ${e.period ? monthYearLabel(e.period) : 'Evergreen (when a month is missing)'}`);
  w();
  w(`- Theme: ${e.theme}`);
  w(`- Subject: ${e.subject}`);
  w(`- Preheader: ${e.preheader}`);
  w(`- Article: [${e.article_title}](${e.article_url}), ${e.article_source}`);
  w(`- Blurb: ${e.article_blurb}`);
  w(`- From Pastor Zac (${e.zac_note.split(/\s+/).length} words): ${e.zac_note}`);
  w();
}

writeFileSync(fileURLToPath(new URL('../docs/CONTENT_REVIEW.md', import.meta.url)), out.join('\n'));
console.log('Wrote docs/CONTENT_REVIEW.md');
