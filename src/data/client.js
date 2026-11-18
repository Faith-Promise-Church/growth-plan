import { createClient } from '@supabase/supabase-js';
import { createDemoClient } from './demoClient.js';

export const isDemo = import.meta.env.VITE_DEMO === '1';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const looksValid =
  typeof url === 'string' &&
  /^https?:\/\//.test(url) &&
  typeof anonKey === 'string' &&
  anonKey.length > 20 &&
  !anonKey.includes('your_');

export const isConfigured = isDemo || looksValid;

export const supabase = import.meta.env.VITE_DEMO === '1'
  ? createDemoClient()
  : createClient(looksValid ? url : 'https://not-configured.invalid', looksValid ? anonKey : 'not-configured', {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
