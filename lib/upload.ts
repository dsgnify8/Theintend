// Uploads an avatar image (as base64 from the image picker) to Supabase Storage
// and returns its public URL. Stored under the user's own folder.

import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export async function uploadAvatar(userId: string, base64: string): Promise<string> {
  const path = `${userId}/avatar_${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
