import { supabaseAdmin } from '../config/supabase';

/**
 * Best-effort mirror of a locally-created user into Supabase Auth.
 *
 * This does NOT replace your existing JWT/bcrypt login — that keeps working
 * exactly as it does today. It just gives each user a matching Supabase Auth
 * identity (linked via user_metadata.appUserId) so that, going forward,
 * Storage/Realtime Row Level Security policies can be written against a real
 * Supabase auth.uid() instead of trusting the anon/publishable key for everyone.
 *
 * Always wrap calls to this in try/catch (or let it fail silently as below) —
 * it must never block or break registration.
 */
export async function syncUserToSupabaseAuth(user: { id: string; email: string; role: string }): Promise<void> {
  try {
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      email_confirm: true, // skip Supabase's own confirmation email — your app handles onboarding
      user_metadata: { appUserId: user.id, role: user.role },
    });
    if (error) {
      console.error('[SupabaseAuthSync] non-fatal:', error.message);
    }
  } catch (err) {
    console.error('[SupabaseAuthSync] non-fatal:', err);
  }
}