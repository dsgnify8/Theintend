// Experts loaded from Supabase, with the built-in list as a fallback so the app
// always works. Admins can edit rows; edits broadcast to every open screen.
// An expert row can be linked to a login via account_email.

import { useEffect, useState } from 'react';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import { readCache, writeCache } from './cache';
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
    photoScale: r.photo_scale ?? 1,
    photoX: r.photo_x ?? 0,
    photoY: r.photo_y ?? 0,
    availability: r.availability ?? null,
    keywords: Array.isArray(r.keywords) ? r.keywords : [],
  };
}

export const EXPERTS_CACHE_KEY = 'experts.v1';

async function fromDisk(): Promise<Expert[]> {
  const disk = await readCache<Expert[]>(EXPERTS_CACHE_KEY);
  return disk && disk.length ? disk : FALLBACK;
}

async function load(): Promise<Expert[]> {
  try {
    const { data, error } = await supabase.from('experts').select('*').order('sort', { ascending: true });
    if (error || !data || data.length === 0) return fromDisk();
    const mapped = data.map(fromRow);
    writeCache(EXPERTS_CACHE_KEY, mapped);
    return mapped;
  } catch {
    return fromDisk();
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
      readCache<Expert[]>(EXPERTS_CACHE_KEY).then((disk) => {
        if (disk && disk.length && !cache) setState({ experts: disk, loading: false });
      });
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

export async function createExpert(row: any) {
  const { error } = await supabase.from('experts').upsert(row, { onConflict: 'id' });
  if (!error) await reloadExperts();
  return { error };
}

// Makes one from nothing, and refuses if the id is taken.
//
// createExpert upserts, which is right for saving an edit and wrong for making
// something new: a collision would quietly overwrite whoever was already there.
export async function newExpert(row: {
  id: string; name: string; title: string; category: string;
  blurb?: string; bio?: string; faqs?: string[]; keywords?: string[];
  profile_url?: string; photo?: string | null; account_email?: string | null;
}): Promise<{ error: any }> {
  const id = row.id.trim();
  if (!id) return { error: { message: 'It needs an id.' } };

  try {
    const { data: taken } = await supabase.from('experts').select('id').eq('id', id).maybeSingle();
    if (taken) return { error: { message: `There is already an expert called ${id}. Choose another id.` } };

    // After everyone else, so a new one does not land in the middle of the
    // list. The order can be changed afterwards.
    const { data: last } = await supabase
      .from('experts').select('sort').order('sort', { ascending: false }).limit(1).maybeSingle();
    const sort = ((last as any)?.sort ?? 0) + 1;

    const { error } = await supabase.from('experts').insert({
      id,
      name: row.name.trim(),
      title: row.title.trim(),
      category: row.category.trim(),
      blurb: row.blurb ?? '',
      bio: row.bio ?? '',
      faqs: row.faqs ?? [],
      keywords: row.keywords ?? [],
      profile_url: row.profile_url ?? 'https://www.theintend.com/experts',
      photo: row.photo ?? null,
      account_email: row.account_email?.trim().toLowerCase() || null,
      sort,
    });
    if (!error) await reloadExperts();
    return { error };
  } catch (e: any) {
    return { error: e };
  }
}

// An id that can live in a route and a storage path.
export function expertSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/^dr\.?\s+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export async function deleteExpert(id: string) {
  const { error } = await supabase.from('experts').delete().eq('id', id);
  if (!error) await reloadExperts();
  return { error };
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
  patch: Partial<{
    name: string; title: string; category: string; blurb: string; bio: string;
    faqs: string[]; keywords: string[]; profile_url: string;
    photo: string; photo_scale: number; photo_x: number; photo_y: number;
    account_email: string; availability: any; sort: number;
  }>
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
