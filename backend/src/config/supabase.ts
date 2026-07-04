import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Backend-only Supabase client ─────────────────────────────────────────────
// Uses the service_role key, which bypasses Row Level Security. This client
// must NEVER be imported into any frontend/browser code — service_role key
// stays server-side only (Render env vars), unlike the publishable key.
//
// createClient() throws synchronously if the URL is missing, which would
// crash the whole server at startup. So we only construct it if both vars
// are present; otherwise we export a stand-in that throws (a clear, caught
// error) only if something actually tries to use it — every caller in this
// codebase already wraps Supabase calls in non-fatal try/catch.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

if (supabaseUrl && supabaseServiceRoleKey) {
  client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
} else {
  console.warn('[Supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — Storage, Auth-sync, and Realtime broadcast will fail until these are set on Render.');
}

export const supabaseAdmin: SupabaseClient =
  client ??
  (new Proxy({} as SupabaseClient, {
    get() {
      throw new Error('Supabase is not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    },
  }));