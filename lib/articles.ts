// Articles. Supabase is the source of truth: articles_cache holds the published
// copy and article_overrides holds admin edits layered on top. The Wix blog has
// been retired, so there is no external service to fall back to. A bundled
// sample ships as the last resort if the table is empty or unreachable.

import { useEffect, useState } from 'react';
import { type Article, type Block, type Run, FALLBACK_ARTICLES } from '@/constants/articles';
import { supabase } from './supabase';

async function loadOverrides(): Promise<Record<string, any>> {
  try {
    const { data } = await supabase.from('article_overrides').select('*');
    const map: Record<string, any> = {};
    for (const o of data ?? []) map[o.post_id] = o;
    return map;
  } catch {
    return {};
  }
}

function applyOverride(base: Article, ov: any): Article {
  if (!ov) return base;
  if (ov.title) base.title = ov.title;
  if (ov.category) base.category = ov.category;
  if (ov.excerpt) base.excerpt = ov.excerpt;
  if (ov.image) base.image = ov.image;
  if (ov.body && Array.isArray(ov.body) && ov.body.length) base.body = ov.body as Block[];
  return base;
}

function rowToArticle(r: any): Article {
  return {
    id: r.post_id,
    title: r.title ?? 'Untitled',
    category: r.category ?? 'Article',
    excerpt: r.excerpt ?? '',
    image: r.image ?? null,
    author: r.author ?? undefined,
    readMinutes: r.read_minutes ?? 4,
    body: Array.isArray(r.body) ? (r.body as Block[]) : [],
  };
}

async function loadFromTable(): Promise<Article[]> {
  try {
    const { data, error } = await supabase
      .from('articles_cache')
      .select('*')
      .order('published_at', { ascending: false });
    if (error || !data) return [];
    return data.map(rowToArticle);
  } catch {
    return [];
  }
}

async function loadArticles(): Promise<Article[]> {
  const overrides = await loadOverrides();
  const rows = await loadFromTable();
  // Nothing published yet, or the table could not be read. Show the bundled
  // sample rather than an empty library.
  if (!rows.length) return FALLBACK_ARTICLES;
  return rows.map((a) => applyOverride(a, overrides[a.id]));
}

let cache: Article[] | null = null;
let inflight: Promise<Article[]> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

type State = { loading: boolean; articles: Article[]; error: string | null };

export function useArticles(): State {
  const [state, setState] = useState<State>(() => ({ loading: !cache, articles: cache ?? [], error: null }));
  useEffect(() => {
    const l = () => setState({ loading: false, articles: cache ?? [], error: null });
    listeners.add(l);
    let timer: any;
    if (cache) {
      setState({ loading: false, articles: cache, error: null });
    } else {
      inflight = inflight ?? loadArticles();
      inflight
        .then((a) => {
          cache = a;
          emit();
        })
        .catch((e) => {
          inflight = null;
          setState({ loading: false, articles: FALLBACK_ARTICLES, error: String(e?.message ?? e) });
        });
      // Safety net: if the network is slow, show fallback instead of spinning forever.
      timer = setTimeout(() => {
        setState((s) => (s.loading ? { loading: false, articles: cache ?? FALLBACK_ARTICLES, error: s.error } : s));
      }, 8000);
    }
    return () => {
      listeners.delete(l);
      if (timer) clearTimeout(timer);
    };
  }, []);
  return state;
}

export function useArticle(id?: string) {
  const { loading, articles, error } = useArticles();
  return { loading, error, article: articles.find((a) => a.id === id) };
}

export async function reloadArticles() {
  cache = await loadArticles();
  emit();
}

// Admin edits. These write to article_overrides and leave the published row in
// articles_cache untouched, so an edit can always be undone by deleting the
// override. The website reads the same two tables.
export async function saveArticleOverride(
  postId: string,
  patch: { title?: string; category?: string; excerpt?: string; image?: string; body?: Block[] }
) {
  const row = { post_id: postId, ...patch, updated_at: new Date().toISOString() };
  const { error } = await supabase.from('article_overrides').upsert(row, { onConflict: 'post_id' });
  if (!error) await reloadArticles();
  return { error };
}

export async function clearArticleOverride(postId: string) {
  const { error } = await supabase.from('article_overrides').delete().eq('post_id', postId);
  if (!error) await reloadArticles();
  return { error };
}

// Plain-text <-> blocks, for the admin editor.
export function blocksToText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      const text = b.runs.map((r) => (r.bold ? `**${r.text}**` : r.text)).join('');
      return b.type === 'h' ? `## ${text}` : text;
    })
    .join('\n\n');
}

export function textToBlocks(text: string): Block[] {
  const paras = text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  return paras.map((p): Block => {
    if (p.startsWith('## ')) return { type: 'h', runs: [{ text: p.slice(3).trim() }] };
    const runs: Run[] = [];
    for (const part of p.split(/(\*\*[^*]+\*\*)/g)) {
      if (!part) continue;
      if (part.startsWith('**') && part.endsWith('**')) runs.push({ text: part.slice(2, -2), bold: true });
      else runs.push({ text: part });
    }
    return { type: 'p', runs };
  });
}
