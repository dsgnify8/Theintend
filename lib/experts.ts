// Experts loaded from Supabase, with the built-in list as a fallback so the app
// always works. Admins can edit rows; edits broadcast to every open screen.
// An expert row can be linked to a login via account_email.

import { useEffect, useState } from 'react';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import { EXPERTS as FALLBACK, type Expert } from '@/constants/experts';

let cache: Expert[] | null = null;
let inflight: Promise<Expert[]> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function fromRow(r: any): Expert {
  return {
    id: r.id,
    name: r.name,
    title: r.title,
    category: r.category,
    blurb: r.blurb,
    bio: r.bio,
    faqs: r.faqs ?? [],
    profileUrl: r.profile_url ?? '',
    photo: r.photo ?? null,
    accountEmail: r.account_email ?? null,
  };
}

async function load(): Promise<Expert[]> {
  try {
    const { data, error } = await supabase.from('experts').select('*').order('sort', { ascending: true });
    if (error || !data || data.length === 0) return FALLBACK;
    return data.map(fromRow);
  } catch {
    return FALLBACK;
  }
}

export function useExperts() {
  const [state, setState] = useState<{ experts: Expert[]; loading: boolean }>(() => ({
    experts: cache ?? FALLBACK,
    loading: !cache,
  }));

  useEffect(() => {
    const l = () => setState({ experts: cache ?? FALLBACK, loading: false });
    listeners.add(l);
    let timer: any;
    if (cache) {
      setState({ experts: cache, loading: false });
    } else {
      inflight = inflight ?? load();
      inflight.then((e) => { cache = e; emit(); }).catch(() => { cache = FALLBACK; emit(); });
      // Safety net: never let the screen spin forever.
      timer = setTimeout(() => { if (!cache) { cache = FALLBACK; emit(); } }, 6000);
    }
    return () => { listeners.delete(l); if (timer) clearTimeout(timer); };
  }, []);

  return { experts: state.experts, loading: state.loading };
}

export function useExpert(id?: string) {
  const { experts, loading } = useExperts();
  return { expert: experts.find((e) => e.id === id), loading };
}

export async function getExpertForEmail(email: string): Promise<Expert | null> {
  try {
    const { data } = await supabase.from('experts').select('*').ilike('account_email', email).limit(1);
    const r = data?.[0];
    return r ? fromRow(r) : null;
  } catch {
    return null;
  }
}

export async function reloadExperts() {
  cache = await load();
  emit();
}

export async function seedExperts() {
  const rows = FALLBACK.map((e, i) => ({
    id: e.id, name: e.name, title: e.title, category: e.category, blurb: e.blurb,
    bio: e.bio, faqs: e.faqs, profile_url: e.profileUrl, photo: e.photo, sort: i,
  }));
  const { error } = await supabase.from('experts').upsert(rows, { onConflict: 'id' });
  if (!error) await reloadExperts();
  return { error };
}

export async function ensureSeeded() {
  try {
    const { data } = await supabase.from('experts').select('id').limit(1);
    if (!data || data.length === 0) await seedExperts();
    else await reloadExperts();
  } catch {
    /* keep fallback */
  }
}

export async function updateExpert(
  id: string,
  patch: Partial<{ bio: string; photo: string; title: string; blurb: string; name: string; account_email: string }>
) {
  const { error } = await supabase.from('experts').update(patch).eq('id', id);
  if (!error) await reloadExperts();
  return { error };
}

export async function uploadExpertImage(expertId: string, base64: string): Promise<string> {
  const path = `experts/${expertId}_${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
