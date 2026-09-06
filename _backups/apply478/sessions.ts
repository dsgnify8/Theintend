// Classes and programs from Supabase, with the built-in lists as a fallback.
// The table is seeded from the built-in data the first time an admin loads it,
// so the originals live alongside anything experts add later.

import { useEffect, useState } from 'react';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import { getLocale } from './i18n';
import {
  CLASSES as FB_CLASSES,
  PROGRAMS as FB_PROGRAMS,
  type SessionClass,
  type Program,
} from '@/constants/sessions';

type Data = { classes: SessionClass[]; programs: Program[] };

let cache: Data | null = null;
let inflight: Promise<Data> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function classFromRow(r: any): SessionClass {
  // Locale-aware. Arabic wins when i18n.ar.<field> exists, otherwise the
  // English canonical is used. expert_name and expert_title are kept as
  // stored for now; the experts table itself is Arabic-aware from apply472
  // and a follow-up will make session cards look up expert names by id.
  const isAr = getLocale() === 'ar';
  const ar = (r.i18n && r.i18n.ar) || {};
  const pick = <T,>(en: T, arVal: any): T => (isAr && arVal ? arVal : en);
  return {
    id: r.id,
    title: pick(r.title, ar.title),
    expertId: r.expert_id,
    expertName: r.expert_name,
    expertTitle: r.expert_title ?? '',
    category: pick(r.category ?? 'Breathwork', ar.category),
    durationHours: Number(r.duration_hours ?? 1),
    date: r.date ?? '',
    time: r.time ?? '',
    going: r.going ?? 0,
    link: r.link ?? '',
    color: r.color ?? '#5C4632',
    banner: r.image ? { uri: r.image } : (FB_CLASSES.find((c) => c.id === r.id)?.banner ?? null),
    description: pick(r.description ?? '', ar.description),
  };
}

function programFromRow(r: any): Program {
  // Same locale-aware pattern as classFromRow.
  const isAr = getLocale() === 'ar';
  const ar = (r.i18n && r.i18n.ar) || {};
  const pick = <T,>(en: T, arVal: any): T => (isAr && arVal ? arVal : en);
  const enCategory = r.category ?? (FB_PROGRAMS.find((p) => p.id === r.id)?.category ?? '');
  return {
    id: r.id,
    title: pick(r.title, ar.title),
    expertId: r.expert_id,
    expertName: r.expert_name,
    // Fall back to the built-in category if a row predates the category column.
    category: pick(enCategory, ar.category),
    weeks: r.weeks ?? 0,
    sessions: r.sessions_count ?? 0,
    cadence: pick(r.cadence ?? '', ar.cadence),
    price: r.price ?? '',
    requiresForm: !!r.requires_form,
    color: r.color ?? '#6F7A6B',
    banner: r.image ? { uri: r.image } : (FB_PROGRAMS.find((p) => p.id === r.id)?.banner ?? null),
    description: pick(r.description ?? '', ar.description),
  };
}

export async function seedSessions() {
  const rows = [
    ...FB_CLASSES.map((c, i) => ({
      id: c.id, kind: 'class', title: c.title, description: c.description,
      expert_id: c.expertId, expert_name: c.expertName, expert_title: c.expertTitle,
      color: c.color, date: c.date, time: c.time, going: c.going,
      duration_hours: c.durationHours, category: c.category, status: 'live', sort: i,
    })),
    ...FB_PROGRAMS.map((p, i) => ({
      id: p.id, kind: 'program', title: p.title, description: p.description,
      expert_id: p.expertId, expert_name: p.expertName, color: p.color,
      weeks: p.weeks, sessions_count: p.sessions, cadence: p.cadence, price: p.price,
      requires_form: p.requiresForm, category: p.category, status: 'live', sort: 100 + i,
    })),
  ];
  return supabase.from('sessions').upsert(rows, { onConflict: 'id' });
}

async function load(): Promise<Data> {
  try {
    let { data } = await supabase.from('sessions').select('*').eq('status', 'live').order('sort', { ascending: true });
    if (!data || data.length === 0) {
      await seedSessions();
      ({ data } = await supabase.from('sessions').select('*').eq('status', 'live').order('sort', { ascending: true }));
    }
    if (!data || data.length === 0) return { classes: FB_CLASSES, programs: FB_PROGRAMS };
    return {
      classes: data.filter((r: any) => r.kind === 'class').map(classFromRow),
      programs: data.filter((r: any) => r.kind === 'program').map(programFromRow),
    };
  } catch {
    return { classes: FB_CLASSES, programs: FB_PROGRAMS };
  }
}

export function useSessions() {
  const [state, setState] = useState<{ classes: SessionClass[]; programs: Program[]; loading: boolean }>(() => ({
    classes: cache?.classes ?? FB_CLASSES,
    programs: cache?.programs ?? FB_PROGRAMS,
    loading: !cache,
  }));

  useEffect(() => {
    const l = () => setState({ classes: cache?.classes ?? FB_CLASSES, programs: cache?.programs ?? FB_PROGRAMS, loading: false });
    listeners.add(l);
    let timer: any;
    if (cache) {
      setState({ classes: cache.classes, programs: cache.programs, loading: false });
    } else {
      inflight = inflight ?? load();
      inflight.then((d) => { cache = d; emit(); }).catch(() => { cache = { classes: FB_CLASSES, programs: FB_PROGRAMS }; emit(); });
      timer = setTimeout(() => { if (!cache) { cache = { classes: FB_CLASSES, programs: FB_PROGRAMS }; emit(); } }, 6000);
    }
    return () => { listeners.delete(l); if (timer) clearTimeout(timer); };
  }, []);

  return state;
}

export async function reloadSessions() {
  cache = await load();
  emit();
}

export async function updateSession(id: string, patch: any) {
  const { error } = await supabase.from('sessions').update(patch).eq('id', id);
  if (!error) await reloadSessions();
  return { error };
}

export async function deleteSession(id: string) {
  const { error } = await supabase.from('sessions').update({ status: 'archived' }).eq('id', id);
  if (!error) await reloadSessions();
  return { error };
}

export async function uploadSessionImage(id: string, base64: string): Promise<string> {
  const path = `sessions/${id}_${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

export async function createSession(row: any) {
  const { error } = await supabase.from('sessions').upsert(row, { onConflict: 'id' });
  if (!error) await reloadSessions();
  return { error };
}
