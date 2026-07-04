import { createClient } from '@supabase/supabase-js';

// Publishable (anon) key only — safe to ship in the built bundle.
// Never put the service_role key here; that stays backend-only on Render.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn('[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY not set — Realtime chat updates will not work.');
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);