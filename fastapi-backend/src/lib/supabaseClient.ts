import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.PROD) {
    throw new Error('Missing Supabase environment variables. Check your .env file.');
  }
  console.error('[supabaseClient] Missing Supabase env variables!');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,         // store session in localStorage
    autoRefreshToken: true,       // automatically refresh expired tokens
    detectSessionInUrl: true,     // detect OAuth redirect
    storage: localStorage,        // explicitly use localStorage
  },
});
