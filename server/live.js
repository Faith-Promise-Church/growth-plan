// Wires the handlers to the real database and SendGrid. Imported only by the files in /api.

import { readEnv } from './env.js';
import { createServiceClient, createServerDb } from './db.js';
import { createSendgridMailer } from './sendgrid.js';
import { createHandlers } from './handlers.js';

let cached;

export function liveHandlers() {
  if (!cached) {
    const env = readEnv();
    const db = createServerDb(createServiceClient(env));
    const mailer = createSendgridMailer({ apiKey: env.SENDGRID_API_KEY });
    cached = createHandlers({
      env,
      db,
      mailer,
      log: (message, data) => console.info(`[checkin] ${message}`, data ?? ''),
    });
  }
  return cached;
}
