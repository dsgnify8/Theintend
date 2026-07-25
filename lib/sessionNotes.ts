// Private per-session notes. Loaded once for the signed-in user, cached and
// broadcast so every screen showing a note stays in step.

import { useEffect, useState } from 'react';
import { supabase } from './supabase';

type Notes = Record<string, string>;

let cache: Notes | null = null;
let inflight: Promise<Notes> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const noteKey = (refId: string, when: string) => `${refId}|${when}`;

async function load(): Promise<Notes> {
  try {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return {};
    const { data, error } = await supabase
      .from('session_notes')
      .select('booking_key,note')
      .eq('user_id', uid);
    if (error || !data) return {};
    const m: Notes = {};
    for (const r of data as any[]) m[r.booking_key] = r.note ?? '';
    return m;
  } catch {
    return {};
  }
}

export function useSessionNotes(): Notes {
  const [notes, setNotes] = useState<Notes>(cache ?? {});
  useEffect(() => {
    const l = () => setNotes(cache ?? {});
    listeners.add(l);
    if (cache) {
      setNotes(cache);
    } else {
      inflight = inflight ?? load();
      inflight.then((m) => { cache = m; emit(); }).catch(() => { cache = {}; emit(); });
    }
    return () => { listeners.delete(l); };
  }, []);
  return notes;
}

export async function saveSessionNote(key: string, note: string): Promise<{ error: any }> {
  try {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return { error: new Error('Sign in to save a note.') };
    const { error } = await supabase.from('session_notes').upsert(
      { user_id: uid, booking_key: key, note, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,booking_key' }
    );
    if (error) return { error };
    cache = { ...(cache ?? {}), [key]: note };
    emit();
    return { error: null };
  } catch (e: any) {
    return { error: e };
  }
}

export async function reloadSessionNotes() {
  cache = await load();
  emit();
}
