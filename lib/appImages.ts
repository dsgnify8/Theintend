// Admin uploadable images, keyed by a stable string. Loaded once, cached in
// memory and broadcast, so an upload on one screen shows on every other.
// Storage goes to the existing public 'avatars' bucket under app/.

import { useEffect, useState } from 'react';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

type Map = Record<string, string>;

let cache: Map | null = null;
let inflight: Promise<Map> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function load(): Promise<Map> {
  try {
    const { data, error } = await supabase.from('app_images').select('key,url');
    if (error || !data) return {};
    const m: Map = {};
    for (const r of data as any[]) if (r.url) m[r.key] = r.url;
    return m;
  } catch {
    return {};
  }
}

export function useAppImages(): Map {
  const [map, setMap] = useState<Map>(cache ?? {});
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

export async function uploadAppImage(key: string, base64: string): Promise<string> {
  const safe = key.replace(/[^a-zA-Z0-9]+/g, '-');
  const path = `app/${safe}_${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  const { error: saveError } = await supabase
    .from('app_images')
    .upsert({ key, url, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (saveError) throw saveError;
  cache = { ...(cache ?? {}), [key]: url };
  emit();
  return url;
}

export async function reloadAppImages() {
  cache = await load();
  emit();
}
