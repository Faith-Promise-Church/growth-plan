// Renders the monthly check-in email: a single 600px column built with tables and inline
// styles. Every value from a person or from checkin_content is escaped. Links must be absolute
// https URLs or they are left out.

import { escapeHtml, oneLine, isHttpsUrl } from '../../src/lib/escape.js';
import { dimensionName } from '../../src/content/dimensions.js';
import { monthName } from '../../src/lib/time.js';

export const MAILING_ADDRESS = 'Faith Promise Church, 10740 Faith Promise Lane, Knoxville, TN 37931';
export const FOOTER_REASON =
  'You are getting this because you signed up for monthly check-ins in the Growth Plan Builder.';
export const MAX_HABITS_IN_EMAIL = 5;

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const C = {
  page: '#F4F2EE',
  card: '#ffffff',
  ink: '#272624',
  muted: '#5f5c57',
  line: '#e2ded6',
  brand: '#326565',
  brandOn: '#ffffff',
  link: '#326565',
};

function listJoin(items) {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function link(url, label, style = '') {
  if (!isHttpsUrl(url)) return escapeHtml(label);
  return `<a href="${escapeHtml(url)}" style="color:${C.link};text-decoration:underline;${style}">${escapeHtml(label)}</a>`;
}

function button(url, label) {
  if (!isHttpsUrl(url)) return '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 8px 0;"><tr><td bgcolor="${C.brand}" style="border-radius:8px;background:${C.brand};"><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 24px;font-family:${FONT};font-size:17px;font-weight:bold;line-height:20px;color:${C.brandOn};text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a></td></tr></table>`;
}

function p(text, style = '') {
  return `<p style="margin:0 0 16px 0;font-family:${FONT};font-size:17px;line-height:26px;color:${C.ink};${style}">${text}</p>`;
}

function h2(text) {
  return `<h2 style="margin:24px 0 8px 0;font-family:${FONT};font-size:20px;line-height:26px;font-weight:bold;color:${C.ink};">${escapeHtml(text)}</h2>`;
}

/**
 * @param {object} args
 * @param {object} args.edition  a checkin_content row (or the evergreen edition)
 * @param {string} args.period  "2027-01-01"
 * @param {object} args.recipient  { firstName, focus: string[], habits: [{ dimension, sentence }], hasPlan }
 * @param {object} args.urls  { checkin, adjust, start, unsubscribe, preferences, logo }
 * @param {boolean} [args.preview]  adds "[Preview]" to the subject
 */
export function renderCheckinEmail({ edition, period, recipient, urls, preview = false }) {
  const month = monthName(period) || 'this month';
  const firstName = oneLine(recipient?.firstName, 60);
  const habits = (recipient?.habits ?? [])
    .map((h) => ({ dimension: h.dimension, sentence: oneLine(h.sentence, 400) }))
    .filter((h) => h.sentence)
    .slice(0, MAX_HABITS_IN_EMAIL);
  const focus = (recipient?.focus ?? []).map(dimensionName).filter(Boolean);
  const hasPlan = Boolean(recipient?.hasPlan) && habits.length > 0;

  const baseSubject = oneLine(edition?.subject, 150) || 'Your monthly check-in';
  const subject = preview ? `[Preview] ${baseSubject}` : baseSubject;
  const preheader = oneLine(edition?.preheader, 200);
  const zac = oneLine(edition?.zac_note, 1200);
  const article = {
    title: oneLine(edition?.article_title, 300),
    source: oneLine(edition?.article_source, 200),
    blurb: oneLine(edition?.article_blurb, 500),
    url: isHttpsUrl(edition?.article_url) ? edition.article_url : '',
  };

  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';
  const intro = hasPlan
    ? `Here is your ${month} check-in. It takes about two minutes.`
    : `Here is your ${month} check-in. When you are ready, building a plan takes about ten minutes.`;

  // ---------- HTML ----------
  const blocks = [];
  blocks.push(p(escapeHtml(greeting)));
  blocks.push(p(escapeHtml(intro)));

  if (hasPlan) {
    if (focus.length) {
      blocks.push(p(`<strong>Your focus areas:</strong> ${escapeHtml(listJoin(focus))}`));
    }
    blocks.push(h2('Your habits'));
    const rows = habits
      .map(
        (h) =>
          `<tr><td style="padding:10px 0;border-top:1px solid ${C.line};font-family:${FONT};"><div style="font-size:13px;line-height:18px;color:${C.muted};font-weight:bold;">${escapeHtml(dimensionName(h.dimension))}</div><div style="font-size:17px;line-height:24px;color:${C.ink};">${escapeHtml(h.sentence)}</div></td></tr>`,
      )
      .join('');
    blocks.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">${rows}</table>`);
    blocks.push(button(urls.checkin, 'Check in on my plan'));
    blocks.push(p(link(urls.adjust, 'Adjust my plan'), 'margin-top:8px;'));
  } else {
    blocks.push(button(urls.start, 'Start my plan'));
  }

  if (zac) {
    blocks.push(h2('From Pastor Zac'));
    blocks.push(p(escapeHtml(zac)));
    blocks.push(p('Pastor Zac', 'font-weight:bold;'));
  }

  if (article.title && article.url) {
    blocks.push(h2('Worth reading this month'));
    blocks.push(
      p(
        `${link(article.url, article.title, 'font-weight:bold;')}${article.source ? `<br><span style="color:${C.muted};font-size:15px;">${escapeHtml(article.source)}</span>` : ''}`,
        'margin-bottom:8px;',
      ),
    );
    if (article.blurb) blocks.push(p(escapeHtml(article.blurb)));
  }

  const logo = isHttpsUrl(urls.logo)
    ? `<img src="${escapeHtml(urls.logo)}" width="200" height="35" alt="Growth Plan Builder" style="display:block;width:200px;max-width:200px;height:auto;border:0;">`
    : `<span style="font-family:${FONT};font-size:20px;font-weight:bold;color:${C.brandOn};">Growth Plan Builder</span>`;

  const footer = [
    escapeHtml(FOOTER_REASON),
    `${link(urls.unsubscribe, 'Unsubscribe', `color:${C.muted};`)} &nbsp;|&nbsp; ${link(urls.preferences, 'Email preferences', `color:${C.muted};`)}`,
    escapeHtml(MAILING_ADDRESS),
  ]
    .map((t) => `<p style="margin:0 0 8px 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};">${t}</p>`)
    .join('');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.page};">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td style="background:${C.brand};padding:20px 24px;border-radius:12px 12px 0 0;">${logo}</td></tr>
<tr><td style="background:${C.card};padding:28px 24px 12px 24px;border-radius:0 0 12px 12px;">
${blocks.join('\n')}
</td></tr>
<tr><td style="padding:20px 8px 8px 8px;">${footer}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  // ---------- Plain text ----------
  const t = [];
  t.push(greeting, '', intro, '');
  if (hasPlan) {
    if (focus.length) t.push(`Your focus areas: ${listJoin(focus)}`, '');
    t.push('Your habits:');
    for (const h of habits) t.push(`- ${dimensionName(h.dimension)}: ${h.sentence}`);
    t.push('');
    if (isHttpsUrl(urls.checkin)) t.push(`Check in on my plan: ${urls.checkin}`);
    if (isHttpsUrl(urls.adjust)) t.push(`Adjust my plan: ${urls.adjust}`);
    t.push('');
  } else if (isHttpsUrl(urls.start)) {
    t.push(`Start my plan: ${urls.start}`, '');
  }
  if (zac) t.push('From Pastor Zac', zac, 'Pastor Zac', '');
  if (article.title && article.url) {
    t.push('Worth reading this month', `${article.title}${article.source ? ` (${article.source})` : ''}`);
    if (article.blurb) t.push(article.blurb);
    t.push(article.url, '');
  }
  t.push('--', FOOTER_REASON);
  if (isHttpsUrl(urls.unsubscribe)) t.push(`Unsubscribe: ${urls.unsubscribe}`);
  if (isHttpsUrl(urls.preferences)) t.push(`Email preferences: ${urls.preferences}`);
  t.push(MAILING_ADDRESS);

  return { subject, preheader, html, text: t.join('\n') };
}
