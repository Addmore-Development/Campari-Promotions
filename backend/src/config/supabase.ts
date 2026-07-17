import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';


const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

if (supabaseUrl && supabaseServiceRoleKey) {
  client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: {
      transport: ws as any,
    },
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