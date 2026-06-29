// Live connection to The Intend's Wix Blog.
// Pulls published posts, keeps English ones, preserves headings/bold/italic.

import { useEffect, useState } from 'react';
import { type Article, type Block, type Run, FALLBACK_ARTICLES } from '@/constants/articles';

const CLIENT_ID = 'e28c1da0-36e8-4a6a-aa16-e81da547fed8';
const BASE = 'https://www.wixapis.com';

let tokenCache: { token: string; exp: number } | null = null;

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.exp) return tokenCache.token;
  const r = await fetch(`${BASE}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: CLIENT_ID, grantType: 'anonymous' }),
  });
  if (!r.ok) throw new Error(`auth ${r.status}`);
  const d = await r.json();
  tokenCache = { token: d.access_token, exp: Date.now() + ((d.expires_in ?? 240) * 1000) - 20000 };
  return tokenCache.token;
}

function mediaUrl(m: any): string | undefined {
  if (!m) return undefined;
  if (typeof m === 'string') {
    if (m.startsWith('http')) return m;
    if (m.startsWith('wix:image://')) {
      const id = m.replace('wix:image://v1/', '').split('#')[0].split('/')[0];
      return `https://static.wixstatic.com/media/${id}`;
    }
    return `https://static.wixstatic.com/media/${m}`;
  }
  return mediaUrl(m.url ?? m.id ?? m.src ?? m.image);
}

function coverOf(p: any): string | undefined {
  const img = p?.media?.wixMedia?.image ?? p?.coverMedia?.image ?? p?.media?.image ?? p?.media;
  return mediaUrl(img);
}

function runsOf(node: any): Run[] {
  const runs: Run[] = [];
  for (const c of node?.nodes ?? []) {
    if (c.type === 'TEXT' && c.textData) {
      const decs = c.textData.decorations ?? [];
      const text = c.textData.text ?? '';
      if (!text) continue;
      runs.push({
        text,
        bold: decs.some((d: any) => d.type === 'BOLD'),
        italic: decs.some((d: any) => d.type === 'ITALIC'),
      });
    }
  }
  return runs;
}

function bodyOf(p: any): Block[] {
  const blocks: Block[] = [];
  const walk = (nodes: any[]) => {
    for (const n of nodes ?? []) {
      if (n.type === 'HEADING') {
        const r = runsOf(n);
        if (r.length) blocks.push({ type: 'h', runs: r });
      } else if (n.type === 'PARAGRAPH') {
        const r = runsOf(n);
        if (r.length) blocks.push({ type: 'p', runs: r });
      } else if (n.nodes) {
        walk(n.nodes);
      }
    }
  };
  walk(p?.richContent?.nodes ?? []);
  if (blocks.length === 0 && p?.excerpt) blocks.push({ type: 'p', runs: [{ text: p.excerpt }] });
  return blocks;
}

async function fetchCategories(token: string): Promise<Record<string, string>> {
  try {
    const r = await fetch(`${BASE}/blog/v3/categories?paging.limit=100`, { headers: { Authorization: token } });
    const d = await r.json();
    const map: Record<string, string> = {};
    for (const c of d.categories ?? []) map[c.id] = c.label ?? c.title ?? '';
    return map;
  } catch {
    return {};
  }
}

async function loadArticles(): Promise<Article[]> {
  const token = await getToken();
  const cats = await fetchCategories(token);
  const r = await fetch(`${BASE}/blog/v3/posts?paging.limit=100&fieldsets=RICH_CONTENT`, {
    headers: { Authorization: token },
  });
  if (!r.ok) throw new Error(`posts ${r.status}`);
  const d = await r.json();
  const posts: any[] = d.posts ?? [];
  const english = posts.filter((p) => !p.language || p.language === 'en');
  return english.map((p): Article => ({
    id: p.id,
    title: p.title ?? 'Untitled',
    category: (p.categoryIds && p.categoryIds.length && cats[p.categoryIds[0]]) || 'Article',
    excerpt: p.excerpt ?? '',
    image: coverOf(p) ?? null,
    author: p.owner?.nickname ?? undefined,
    readMinutes: p.minutesToRead ?? 4,
    body: bodyOf(p),
  }));
}

let cache: Article[] | null = null;
let inflight: Promise<Article[]> | null = null;

type State = { loading: boolean; articles: Article[]; error: string | null };

export function useArticles(): State {
  const [state, setState] = useState<State>(() => ({ loading: !cache, articles: cache ?? [], error: null }));
  useEffect(() => {
    if (cache) {
      setState({ loading: false, articles: cache, error: null });
      return;
    }
    let active = true;
    inflight = inflight ?? loadArticles();
    inflight
      .then((a) => {
        cache = a;
        if (active) setState({ loading: false, articles: a, error: null });
      })
      .catch((e) => {
        inflight = null;
        if (active) setState({ loading: false, articles: FALLBACK_ARTICLES, error: String(e?.message ?? e) });
      });
    return () => {
      active = false;
    };
  }, []);
  return state;
}
