import { supabaseAdmin } from '../config/supabase';

// Create this bucket once in Supabase dashboard: Storage > New bucket > "activation-shots" (public).
const DEFAULT_BUCKET = 'activation-shots';

/**
 * Uploads a file buffer (e.g. from multer.memoryStorage()) to Supabase Storage
 * and returns a public URL. Replaces local disk storage, which doesn't persist
 * across Render restarts/redeploys.
 */
export async function uploadToSupabaseStorage(
  buffer: Buffer,
  originalName: string,
  mimetype: string,
  bucket: string = DEFAULT_BUCKET
): Promise<string> {
  const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = `${Date.now()}-${safeName}`;

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, buffer, { contentType: mimetype, upsert: false });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Deletes a previously-uploaded file, given the public URL stored in the DB. */
export async function deleteFromSupabaseStorage(publicUrl: string, bucket: string = DEFAULT_BUCKET): Promise<void> {
  const marker = `/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length);
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  if (error) console.error('[SupabaseStorage] delete failed (non-fatal):', error.message);
}