// Small helpers for the Vercel functions (Web Request/Response API).

import { MAX_BODY_BYTES } from '../src/lib/checkinCore.js';

export function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

export function methodNotAllowed(allowed) {
  return json(405, { error: 'Method not allowed' }, { Allow: allowed.join(', ') });
}

export class BodyError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Reads the body with a hard size limit, whatever Content-Length says.
export async function readBody(request, limit = MAX_BODY_BYTES) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > limit) throw new BodyError(413, 'Payload too large');
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
      throw new BodyError(413, 'Payload too large');
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
}

export async function readJson(request, limit) {
  const text = await readBody(request, limit);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new BodyError(400, 'Invalid JSON');
  }
}

export function bearer(request) {
  const h = request.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}

export function errorResponse(err) {
  if (err instanceof BodyError) return json(err.status, { error: err.message });
  return json(500, { error: 'Something went wrong. Please try again.' });
}
