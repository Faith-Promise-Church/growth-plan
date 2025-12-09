import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
const isValidUrl = supabaseUrl && supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co');
const isValidKey = supabaseAnonKey && supabaseAnonKey.length > 20 && !supabaseAnonKey.includes('your_');

if (!isValidUrl || !isValidKey) {
  console.error('═══════════════════════════════════════════════════════════════');
  console.error('SUPABASE CONFIGURATION ERROR');
  console.error('═══════════════════════════════════════════════════════════════');
  console.error('Missing or invalid Supabase environment variables!');
  console.error('');
  console.error('Current values:');
  console.error(`  VITE_SUPABASE_URL: ${supabaseUrl || '(not set)'}`);
  console.error(`  VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : '(not set)'}`);
  console.error('');
  console.error('To fix this:');
  console.error('1. Open your .env.local file in the project root');
  console.error('2. Replace "your_anon_key_here" with your actual Supabase anon key');
  console.error('3. Get your anon key from: https://supabase.com/dashboard/project/txllovbgowkfxwzuqwqm/settings/api');
  console.error('4. Restart the dev server after updating .env.local');
  console.error('═══════════════════════════════════════════════════════════════');
}

// Export a flag indicating if Supabase is properly configured
export const isSupabaseConfigured = isValidUrl && isValidKey;

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
