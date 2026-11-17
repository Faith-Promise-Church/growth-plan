// Scans every user-facing string for the copy rules and fails on any hit:
//   - em dashes (and en dashes used as dashes, and &mdash;)
//   - the banned adverbs: really, truly, simply, just, quietly
//   - leading zeroes ("01", "07")
//   - unresolved template tokens ("{{", "}}") and the words "undefined" or "null" in content
//
// It reads: the content modules (dimensions, assessment, practices, check-in editions), and every
// string literal and JSX text node in src/pages, src/components, the Helper and check-in logic, and
// the email renderer. The 20 v1 flourishing questions are exempt: their wording may not change.
// Run: node scripts/check-copy.js

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIMENSIONS } from '../src/content/dimensions.js';
import { FLOURISHING_QUESTIONS, HABIT_ITEMS, HABIT_STEM, FREQUENCY_OPTIONS, HARVARD_ATTRIBUTION, FLOURISHING_SCALE } from '../src/content/assessment.js';
import { PRACTICES } from '../src/content/practices.js';
import { CHECKIN_EDITIONS, EVERGREEN_EDITION } from '../src/content/checkinEditions.js';
import { CADENCES } from '../src/lib/habits.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BANNED = ['really', 'truly', 'simply', 'just', 'quietly'];
const LOCKED = new Set(Object.values(FLOURISHING_QUESTIONS).flat().map((q) => q.text));

const problems = [];

function checkString(text, where, { content = false } = {}) {
  if (typeof text !== 'string' || !text.trim()) return;
  if (LOCKED.has(text)) return;
  if (/[—]|&mdash;|\s–\s|\s--\s/.test(text)) problems.push(`${where}: em dash in "${text.slice(0, 80)}"`);
  for (const w of BANNED) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(text)) problems.push(`${where}: "${w}" in "${text.slice(0, 80)}"`);
  }
  // Leading zeroes in words people read. Skip URLs, ids, dates and phone numbers.
  const visible = text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, '')
    .replace(/\d{4}-\d{2}-\d{2}/g, '')
    .replace(/\d{3}-\d{3}-\d{4}/g, '');
  if (/(^|[^\d.,:\-/#])0\d/.test(visible)) problems.push(`${where}: leading zero in "${text.slice(0, 80)}"`);
  if (/\{\{|\}\}/.test(text)) problems.push(`${where}: template token in "${text.slice(0, 80)}"`);
  if (content && /\b(undefined|null|NaN)\b/.test(text)) problems.push(`${where}: "${text.slice(0, 80)}"`);
}

const NOT_READ = new Set(['key', 'legacyNames', 'habitItem', 'practice', 'column', 'dimension', 'cadence', 'period', 'article_url', 'value', 'type']);

function walkValues(value, where) {
  const field = where.split('.').pop().replace(/\[\d+\]$/, '');
  if (NOT_READ.has(field)) return;
  if (typeof value === 'string') checkString(value, where, { content: true });
  else if (Array.isArray(value)) value.forEach((v, i) => walkValues(v, `${where}[${i}]`));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walkValues(v, `${where}.${k}`);
}

// ---------- 1. Content modules ----------
walkValues(DIMENSIONS, 'dimensions');
walkValues(FLOURISHING_QUESTIONS, 'assessment.flourishing');
walkValues(HABIT_ITEMS, 'assessment.habits');
walkValues({ HABIT_STEM, FREQUENCY_OPTIONS, HARVARD_ATTRIBUTION, FLOURISHING_SCALE }, 'assessment');
walkValues(PRACTICES, 'practices');
walkValues(CHECKIN_EDITIONS, 'checkinEditions');
walkValues(EVERGREEN_EDITION, 'checkinEditions.evergreen');
walkValues(CADENCES, 'cadences');

// ---------- 2. Strings in source files ----------
function files(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(jsx?|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

// Pulls string literals, template literal text, and JSX text out of a file, skipping comments.
function extractStrings(src) {
  const out = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '/' && next === '/') {
      while (i < n && src[i] !== '\n') i += 1;
    } else if (c === '/' && next === '*') {
      i = src.indexOf('*/', i + 2);
      i = i < 0 ? n : i + 2;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      let s = '';
      while (j < n && src[j] !== c && src[j] !== '\n') {
        if (src[j] === '\\') {
          s += src[j + 1];
          j += 2;
        } else {
          s += src[j];
          j += 1;
        }
      }
      out.push(s);
      i = j + 1;
    } else if (c === '`') {
      let j = i + 1;
      let s = '';
      while (j < n && src[j] !== '`') {
        if (src[j] === '\\') {
          s += src[j + 1];
          j += 2;
        } else if (src[j] === '$' && src[j + 1] === '{') {
          let depth = 1;
          j += 2;
          while (j < n && depth) {
            if (src[j] === '{') depth += 1;
            else if (src[j] === '}') depth -= 1;
            j += 1;
          }
          s += ' X ';
        } else {
          s += src[j];
          j += 1;
        }
      }
      out.push(s);
      i = j + 1;
    } else if (c === '>' && src[i - 1] !== '=' && src[i - 1] !== '-') {
      // JSX text: from ">" to the next "<" or "{", if it contains letters.
      let j = i + 1;
      while (j < n && !'<{}>;)'.includes(src[j])) j += 1;
      const text = src.slice(i + 1, j);
      if ((src[j] === '<' || src[j] === '{') && /[A-Za-z]{2,}/.test(text) && !/[=(&|]/.test(text)) out.push(text.trim());
      i = j;
    } else {
      i += 1;
    }
  }
  return out;
}

const SCAN = [
  'src/pages',
  'src/components',
  'src/lib/helper.js',
  'src/lib/checkinAdjustments.js',
  'src/lib/checkinCore.js',
  'src/data/api.js',
  'src/auth',
  'server/email',
  'server/handlers.js',
  'server/engine.js',
];

for (const entry of SCAN) {
  const abs = join(ROOT, entry);
  const list = statSync(abs).isDirectory() ? files(abs) : [abs];
  for (const file of list) {
    const src = readFileSync(file, 'utf8');
    const rel = relative(ROOT, file);
    if (/—|&mdash;/.test(src)) problems.push(`${rel}: em dash in the file`);
    for (const s of extractStrings(src)) checkString(s, rel);
  }
}

if (problems.length) {
  console.error(`Copy check failed with ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log('Copy check passed.');
