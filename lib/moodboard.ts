import { createClient } from '@/lib/supabase/client';
import { uid } from '@/lib/utils';
import type { MoodboardImage } from '@/lib/types';

const BUCKET = 'moodboard';
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function uploadMoodboardImage(file: File): Promise<MoodboardImage> {
  if (!ALLOWED.has(file.type)) {
    throw new Error('Alleen JPG, PNG, WebP of GIF.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Foto mag maximaal 15 MB zijn.');
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Niet ingelogd');

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const id = uid();
  const path = `${user.id}/${id}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { id, path, url: data.publicUrl };
}

export async function deleteMoodboardImage(path: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
