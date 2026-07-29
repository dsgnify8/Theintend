// The homepage's featured picks. Loaded once, cached, broadcast on change.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type FeaturedMap = Record<string, string>; // slot -> item id

let cache: FeaturedMap | null = null;
let inflight: Promise<FeaturedMap> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function load(): Promise<FeaturedMap> {
  try {
    const { data, error } = await supabase.from('featured').select('slot,value');
    if (error || !data) return {};
    const m: FeaturedMap = {};
    for (const r of data as any[]) if (r.value) m[r.slot] = r.value;
    return m;
  } catch {
    return {};
  }
}

export function useFeatured(): FeaturedMap {
  const [map, setMap] = useState<FeaturedMap>(cache ?? {});
  useEffect(() => {
    const l = () => setMap(cache ?? {});
    listeners.add(l);
    if (cache) {
      setMap(cache);
    } else {
      inflight = inflight ?? load();
      inflight.then((m) => { cache = m; emit(); }).catch(() => { cache = {}; emit(); });
    }
    return () => { listeners.delete(l); };
  }, []);
  return map;
}

export async function setFeatured(slot: string, value: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('featured')
      .upsert({ slot, value, updated_at: new Date().toISOString() }, { onConflict: 'slot' });
    if (error) return { error };
    cache = { ...(cache ?? {}), [slot]: value };
    emit();
    return { error: null };
  } catch (e: any) {
    return { error: e };
  }
}

export async function clearFeatured(slot: string): Promise<void> {
  try {
    await supabase.from('featured').delete().eq('slot', slot);
    if (cache) { const next = { ...cache }; delete next[slot]; cache = next; emit(); }
  } catch {}
}

export async function reloadFeatured() {
  cache = await load();
  emit();
}
