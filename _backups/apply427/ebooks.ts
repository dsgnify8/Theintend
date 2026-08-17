// E-books that were uploaded rather than bundled.
//
// The five in constants/library are part of the app. These are added from the
// admin panel and read over the network. Both are handed out in the same shape
// so nothing on a shelf has to care which it is holding.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { LIBRARY, type LibraryItem } from '@/constants/library';

export type Ebook = {
  id: string;
  title: string;
  author: string;
  description: string;
  length: string;
  color: string;
  file_url: string;
  cover_url: string | null;
  published: boolean;
  sort: number;
  created_at: string;
};

// The shape every shelf already understands, plus the url that tells the
// reader not to look for a bundled file.
export type ShelfItem = LibraryItem & { url?: string; coverUrl?: string };

export function asShelfItem(b: Ebook): ShelfItem {
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    type: 'E-book',
    color: b.color,
    length: b.length,
    description: b.description,
    url: b.file_url,
    coverUrl: b.cover_url ?? undefined,
  };
}

let cache: Ebook[] | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function load(all: boolean): Promise<Ebook[]> {
  try {
    let q = supabase.from('ebooks').select('*').order('sort').order('created_at', { ascending: false });
    if (!all) q = q.eq('published', true);
    const { data } = await q;
    return (data as Ebook[]) ?? [];
  } catch {
    return [];
  }
}

// The bundled five and the uploaded ones together, in one list.
//
// Bundled first, since they are the ones people have already seen on the
// homepage and moving them about would be unsettling.
export function useShelfEbooks(): { items: ShelfItem[]; loading: boolean; reload: () => void } {
  const [uploaded, setUploaded] = useState<Ebook[]>(cache ?? []);
  const [loading, setLoading] = useState(cache === null);

  const reload = useCallback(async () => {
    const list = await load(false);
    cache = list;
    setUploaded(list);
    setLoading(false);
    emit();
  }, []);

  useEffect(() => {
    const l = () => setUploaded(cache ?? []);
    listeners.add(l);
    if (cache === null) reload();
    else setLoading(false);
    return () => { listeners.delete(l); };
  }, [reload]);

  // An uploaded book with the same id replaces the bundled one, so a book can
  // be revised without a build. Both keep their place in the order, since the
  // replaced one holds the position its bundled version had.
  const uploadedIds = new Set(uploaded.map((b) => b.id));
  const bundled = (LIBRARY.filter((i) => i.type === 'E-book') as ShelfItem[])
    .filter((i) => !uploadedIds.has(i.id));

  return { items: [...bundled, ...uploaded.map(asShelfItem)], loading, reload };
}

// Everything, published or not, for admin.
export function useAllEbooks() {
  const [items, setItems] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setItems(await load(true));
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { items, loading, reload };
}

// One book by id, from either place, for the reader.
export async function findEbook(id: string): Promise<ShelfItem | null> {
  // The table first, so what opens is what the shelf showed. A bundled book
  // that has been replaced must not open its old self.
  try {
    const { data } = await supabase.from('ebooks').select('*').eq('id', id).maybeSingle();
    if (data) return asShelfItem(data as Ebook);
  } catch {}
  return (LIBRARY.find((i) => i.id === id) as ShelfItem | undefined) ?? null;
}

export async function saveEbook(b: Partial<Ebook> & { id: string }): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('ebooks')
      .upsert({ ...b, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (!error) { cache = null; }
    return { error };
  } catch (e: any) {
    return { error: e };
  }
}

export async function deleteEbook(id: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase.from('ebooks').delete().eq('id', id);
    if (!error) { cache = null; }
    return { error };
  } catch (e: any) {
    return { error: e };
  }
}

// An id that can live in a route and a storage path.
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}
