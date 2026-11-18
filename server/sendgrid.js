// SendGrid v3 Mail Send, called with plain fetch. One request per recipient.
// Field names follow https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send
// (personalizations, from, reply_to, subject, content, headers, tracking_settings).

import { oneLine } from '../src/lib/escape.js';

export const SENDGRID_URL = 'https://api.sendgrid.com/v3/mail/send';

export function buildSendgridPayload({ to, from, replyTo, subject, html, text, headers = {}, categories = [], customArgs = {} }) {
  const payload = {
    personalizations: [{ to: [{ email: to.email, ...(to.name ? { name: oneLine(to.name, 100) } : {}) }] }],
    from: { email: from.email, ...(from.name ? { name: oneLine(from.name, 100) } : {}) },
    subject: oneLine(subject, 150),
    // text/plain must come before text/html
    content: [
      { type: 'text/plain', value: text },
      { type: 'text/html', value: html },
    ],
    headers,
    tracking_settings: {
      click_tracking: { enable: false, enable_text: false },
      open_tracking: { enable: false },
      subscription_tracking: { enable: false },
    },
  };
  if (replyTo?.email) payload.reply_to = { email: replyTo.email, ...(replyTo.name ? { name: oneLine(replyTo.name, 100) } : {}) };
  if (categories.length) payload.categories = categories.slice(0, 10);
  if (Object.keys(customArgs).length) payload.custom_args = customArgs;
  return payload;
}

/**
 * @returns {{ send(payload): Promise<{ ok: boolean, status: number, retryable: boolean, error?: string }> }}
 */
export function createSendgridMailer({ apiKey, fetchImpl = globalThis.fetch, timeoutMs = 15000 }) {
  return {
    async send(payload) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetchImpl(SENDGRID_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        if (res.status === 202 || res.status === 200) return { ok: true, status: res.status, retryable: false };
        let detail = '';
        try {
          detail = (await res.text()).slice(0, 300);
        } catch {
          detail = '';
        }
        const retryable = res.status === 429 || res.status >= 500;
        return { ok: false, status: res.status, retryable, error: `SendGrid ${res.status}${detail ? `: ${detail}` : ''}` };
      } catch (err) {
        const timedOut = err?.name === 'AbortError';
        return { ok: false, status: 0, retryable: true, error: timedOut ? 'SendGrid timeout' : `SendGrid request failed: ${err?.message ?? err}` };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
