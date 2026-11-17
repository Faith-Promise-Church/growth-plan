// Server-only configuration. None of these may be prefixed with VITE_ (anything with that
// prefix ships to the browser).

export const SERVER_ENV_KEYS = [
  'SENDGRID_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CRON_SECRET',
  'CHECKIN_TOKEN_SECRET',
  'CHECKIN_FROM_EMAIL',
  'CHECKIN_FROM_NAME',
  'CHECKIN_REPLY_TO',
  'APP_URL',
];

export function readEnv(source = process.env) {
  const env = {};
  for (const k of SERVER_ENV_KEYS) env[k] = source[k] ?? '';
  env.CHECKIN_DRY_RUN = source.CHECKIN_DRY_RUN === '1';
  return env;
}

export function missingEnv(env, keys) {
  return keys.filter((k) => !env[k]);
}
