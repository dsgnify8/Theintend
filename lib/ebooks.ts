// E-books that were uploaded rather than bundled.
//
// The five in constants/library are part of the app. These are added from the
// admin panel and read over the network. Both are handed out in the same shape
// so nothing on a shelf has to care which it is holding.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { LIBRARY, type LibraryItem } from '@/constants/library';
import { getLocale } from './i18n';

export type Ebook = {
  id: string;
  title: string;
  author: string;
  description: string;
  length: string;
  color: string;
  file_url: string;
  cover_url: string | null;
  tag: string | null;
  read_time: string | null;
  on_home: boolean;
  published: boolean;
  sort: number;
  created_at: string;
};

// The shape every shelf already understands, plus the url that tells the
// reader not to look for a bundled file.
export type ShelfItem = LibraryItem & { url?: string; coverUrl?: string };

// Locale-aware transform of an ebook row. When the app is in Arabic and
// i18n.ar.<field> exists on the row, that value wins; otherwise the English
// canonical is used. Mirrors the pattern in lib/experts.ts and lib/services.ts.
export function fromRow(r: any): Ebook {
  const isAr = getLocale() === 'ar';
  const ar = (r.i18n && r.i18n.ar) || {};
  const pick = <T,>(en: T, arVal: any): T => (isAr && arVal ? arVal : en);
  return {
    id: r.id,
    title: pick(r.title, ar.title),
    author: pick(r.author, ar.author),
    description: pick(r.description ?? '', ar.description),
    length: pick(r.length ?? '', ar.length),
    color: r.color,
    file_url: r.file_url,
    cover_url: r.cover_url ?? null,
    tag: pick(r.tag ?? null, ar.tag),
    read_time: pick(r.read_time ?? null, ar.read_time),
    on_home: !!r.on_home,
    published: !!r.published,
    sort: r.sort ?? 0,
    created_at: r.created_at ?? '',
  };
}

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
    if (!data) return [];
    return data.map(fromRow);
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
// The ones chosen for the homepage carousel.
//
// Falls back rather than showing a gap: a book with no tag borrows its author,
// and one with no reading time says what it is instead.
export type HomeBook = {
  id: string;
  tag: string;
  time: string;
  title: string;
  blurb: string;
  coverUrl: string;
};

export function useHomeEbooks(): HomeBook[] {
  const [items, setItems] = useState<HomeBook[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('ebooks')
          .select('*')
          .eq('published', true)
          .eq('on_home', true)
          .order('sort');
        if (!alive || !data) return;
        // fromRow applies locale-aware picks before the projection below, so
        // the home carousel matches whatever the shelf shows.
        setItems(data.map(fromRow).map((b) => ({
          id: b.id,
          tag: (b.tag || b.author || 'THE INTEND').toUpperCase(),
          time: b.read_time || b.length || 'Guided e-book',
          title: b.title,
          blurb: b.description,
          coverUrl: b.cover_url ?? '',
        })));
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  return items;
}

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
    if (data) return asShelfItem(fromRow(data));
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

// For the admin editor. Fetches the raw ebook row so both languages come in
// side by side, unaffected by the locale-aware cache. Preserves the raw
// i18n object so a save can merge instead of replace.
export async function loadEbookForEdit(id: string): Promise<{
  en: Ebook;
  ar: { title: string; author: string; description: string; length: string; tag: string; read_time: string };
  i18nRaw: any;
} | null> {
  try {
    const { data } = await supabase.from('ebooks').select('*').eq('id', id).maybeSingle();
    if (!data) return null;
    const i18nRaw = (data as any).i18n ?? {};
    const ar = i18nRaw.ar ?? {};
    // English canonical is the row values themselves, unlocalised.
    const en: Ebook = {
      id: data.id,
      title: data.title,
      author: data.author,
      description: data.description ?? '',
      length: data.length ?? '',
      color: data.color,
      file_url: data.file_url,
      cover_url: data.cover_url ?? null,
      tag: data.tag ?? null,
      read_time: data.read_time ?? null,
      on_home: !!data.on_home,
      published: !!data.published,
      sort: data.sort ?? 0,
      created_at: data.created_at ?? '',
    };
    return {
      en,
      ar: {
        title: ar.title ?? '',
        author: ar.author ?? '',
        description: ar.description ?? '',
        length: ar.length ?? '',
        tag: ar.tag ?? '',
        read_time: ar.read_time ?? '',
      },
      i18nRaw,
    };
  } catch {
    return null;
  }
}

// For admin list rendering. Directly queries all rows (published or not) and
// returns them in English regardless of app locale, since admin UI is
// English throughout.
export async function loadEbooksRaw(): Promise<Ebook[]> {
  try {
    const { data } = await supabase.from('ebooks').select('*').order('sort').order('created_at', { ascending: false });
    if (!data) return [];
    return (data as Ebook[]).map((r) => ({
      id: r.id,
      title: r.title,
      author: r.author,
      description: r.description ?? '',
      length: r.length ?? '',
      color: r.color,
      file_url: r.file_url,
      cover_url: r.cover_url ?? null,
      tag: r.tag ?? null,
      read_time: r.read_time ?? null,
      on_home: !!r.on_home,
      published: !!r.published,
      sort: r.sort ?? 0,
      created_at: r.created_at ?? '',
    }));
  } catch {
    return [];
  }
}
