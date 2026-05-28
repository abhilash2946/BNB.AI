import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logs to ensure Vite env vars are available at runtime
try {
	// Note: don't print the full anon key to avoid accidental leaks in logs
	// only indicate presence/absence
	// eslint-disable-next-line no-console
	console.log('[supabaseClient] VITE_SUPABASE_URL =', supabaseUrl);
	// eslint-disable-next-line no-console
	console.log('[supabaseClient] VITE_SUPABASE_ANON_KEY =', supabaseAnonKey ? 'present' : 'MISSING');
	if (!supabaseUrl || !supabaseAnonKey) {
		// eslint-disable-next-line no-console
		console.error('[supabaseClient] Missing Supabase env vars. Ensure .env contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and restart the dev server.');
	}
} catch (e) {
	// eslint-disable-next-line no-console
	console.warn('[supabaseClient] Could not read import.meta.env (not running inside Vite module)', e);
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');