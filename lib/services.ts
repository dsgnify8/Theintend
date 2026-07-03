// Expert services from Supabase, with the transferred list as a fallback.
// Seeds from the built-in list the first time an admin loads it.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { EXPERT_SERVICES as FALLBACK, type Service } from '@/constants/services';

export type FullService = Service & {
  kind: 'single' | 'package';
  sessionsTotal: number | null;
  description: string;
  location: string | null;
  packageId: string | null;
};

const FB: FullService[] = FALLBACK.map((s) => ({ ...s, kind: 'single', sessionsTotal: null, description: '', location: null, packageId: null }));

let cache: FullService[] | null = null;
let inflight: Promise<FullService[]> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function fromRow(r: any): FullService {
  return {
    id: r.id,
    expertId: r.expert_id,
    name: r.name,
    tagline: r.tagline ?? '',
    durationMin: r.duration_min ?? null,
    price: r.price ?? '',
    online: !!r.online,
    inPerson: !!r.in_person,
    image: r.image ?? null,
    kind: r.kind === 'package' ? 'package' : 'single',
    sessionsTotal: r.sessions_total ?? null,
    description: r.description ?? '',
    location: r.location ?? null,
    packageId: r.package_id ?? null,
  };
}

export async function seedServices() {
  const rows = FALLBACK.map((s, i) => ({
    id: s.id, expert_id: s.expertId, name: s.name, tagline: s.tagline,
    duration_min: s.durationMin, price: s.price, online: s.online, in_person: s.inPerson,
    image: s.image, sort: i,
  }));
  return supabase.from('services').upsert(rows, { onConflict: 'id' });
}

async function load(): Promise<FullService[]> {
  try {
    let { data } = await supabase.from('services').select('*').order('sort', { ascending: true });
    if (!data || data.length === 0) {
      await seedServices();
      ({ data } = await supabase.from('services').select('*').order('sort', { ascending: true }));
    }
    if (!data || data.length === 0) return FB;
    return data.map(fromRow);
  } catch {
    return FB;
  }
}

export function useServices() {
  const [state, setState] = useState<{ services: FullService[]; loading: boolean }>(() => ({
    services: cache ?? FB,
    loading: !cache,
  }));
  useEffect(() => {
    const l = () => setState({ services: cache ?? FB, loading: false });
    listeners.add(l);
    if (cache) setState({ services: cache, loading: false });
    else {
      inflight = inflight ?? load();
      inflight.then((d) => { cache = d; emit(); }).catch(() => { cache = FB; emit(); });
    }
    return () => { listeners.delete(l); };
  }, []);
  return state;
}

export function useExpertServices(expertId?: string) {
  const { services, loading } = useServices();
  return { services: services.filter((s) => s.expertId === expertId), loading };
}

export function useService(id?: string) {
  const { services, loading } = useServices();
  return { service: id ? services.find((s) => s.id === id) ?? null : null, loading };
}

export async function reloadServices() {
  cache = await load();
  emit();
}
