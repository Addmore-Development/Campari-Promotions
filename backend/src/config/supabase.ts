import { createClient } from '@supabase/supabase-js';

// ── Backend-only Supabase client ─────────────────────────────────────────────
// Uses the service_role key, which bypasses Row Level Security. This client
// must NEVER be imported into any frontend/browser code — service_role key
// stays server-side only (Render env vars), unlike the publishable key.
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — Storage, Auth-sync, and Realtime broadcast will fail.');
}

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);