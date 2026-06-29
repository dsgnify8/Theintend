// Classes and programs from Supabase, with the built-in lists as a fallback.
// The table is seeded from the built-in data the first time an admin loads it,
// so the originals live alongside anything experts add later.

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
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
  return {
    id: r.id,
    title: r.title,
    expertId: r.expert_id,
    expertName: r.expert_name,
    expertTitle: r.expert_title ?? '',
    category: r.category ?? 'Breathwork',
    durationHours: Number(r.duration_hours ?? 1),
    date: r.date ?? '',
    time: r.time ?? '',
    going: r.going ?? 0,
    color: r.color ?? '#5C4632',
    description: r.description ?? '',
  };
}

function programFromRow(r: any): Program {
  return {
    id: r.id,
    title: r.title,
    expertId: r.expert_id,
    expertName: r.expert_name,
    weeks: r.weeks ?? 0,
    sessions: r.sessions_count ?? 0,
    cadence: r.cadence ?? '',
    price: r.price ?? '',
    requiresForm: !!r.requires_form,
    color: r.color ?? '#6F7A6B',
    description: r.description ?? '',
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
      requires_form: p.requiresForm, status: 'live', sort: 100 + i,
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
    if (cache) {
      setState({ classes: cache.classes, programs: cache.programs, loading: false });
    } else {
      inflight = inflight ?? load();
      inflight.then((d) => { cache = d; emit(); }).catch(() => { cache = { classes: FB_CLASSES, programs: FB_PROGRAMS }; emit(); });
    }
    return () => { listeners.delete(l); };
  }, []);

  return state;
}

export async function reloadSessions() {
  cache = await load();
  emit();
}

export async function createSession(row: any) {
  const { error } = await supabase.from('sessions').upsert(row, { onConflict: 'id' });
  if (!error) await reloadSessions();
  return { error };
}
