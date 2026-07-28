// sync-articles: pulls posts from the Wix blog and caches them in Supabase so
// the app never depends on Wix being reachable. Safe to run on a schedule.
// It never clears the cache on failure: a bad Wix day leaves the last good copy.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CLIENT_ID = Deno.env.get('WIX_CLIENT_ID') ?? 'e28c1da0-36e8-4a6a-aa16-e81da547fed8';
const BASE = 'https://www.wixapis.com';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function getToken(): Promise<string> {
  const r = await fetch(`${BASE}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: CLIENT_ID, grantType: 'anonymous' }),
  });
  if (!r.ok) throw new Error(`auth ${r.status}`);
  const d = await r.json();
  return d.access_token;
}

function mediaUrl(m: any): string | null {
  if (!m) return null;
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

function coverOf(p: any): string | null {
  const img = p?.media?.wixMedia?.image ?? p?.coverMedia?.image ?? p?.media?.image ?? p?.media;
  return mediaUrl(img);
}

function runsOf(node: any) {
  const runs: any[] = [];
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

function bodyOf(p: any) {
  const blocks: any[] = [];
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
    if (!r.ok) return {};
    const d = await r.json();
    const map: Record<string, string> = {};
    for (const c of d.categories ?? []) map[c.id] = c.label ?? c.title ?? '';
    return map;
  } catch {
    return {};
  }
}

async function fetchPosts(token: string, rich: boolean, limit: number): Promise<any[]> {
  const url = `${BASE}/blog/v3/posts?paging.limit=${limit}` + (rich ? '&fieldsets=RICH_CONTENT' : '');
  const r = await fetch(url, { headers: { Authorization: token } });
  if (!r.ok) throw new Error(`posts ${r.status}`);
  const d = await r.json();
  return d.posts ?? [];
}

Deno.serve(async () => {
  try {
    const token = await getToken();
    const cats = await fetchCategories(token);

    let posts: any[] = [];
    try {
      posts = await fetchPosts(token, true, 50);
    } catch (e) {
      posts = await fetchPosts(token, false, 50);
    }

    const english = posts.filter((p: any) => !p.language || p.language === 'en');
    if (english.length === 0) return json({ ok: false, error: 'no posts returned', synced: 0 });

    const rows = english.map((p: any) => ({
      post_id: p.id,
      title: p.title ?? 'Untitled',
      category: (p.categoryIds && p.categoryIds.length && cats[p.categoryIds[0]]) || 'Article',
      excerpt: p.excerpt ?? '',
      image: coverOf(p),
      author: p.owner?.nickname ?? null,
      read_minutes: p.minutesToRead ?? 4,
      body: bodyOf(p),
      published_at: p.firstPublishedDate ?? p.lastPublishedDate ?? null,
      synced_at: new Date().toISOString(),
    }));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { error } = await supabase.from('articles_cache').upsert(rows, { onConflict: 'post_id' });
    if (error) return json({ ok: false, error: error.message }, 500);

    return json({ ok: true, synced: rows.length });
  } catch (e) {
    // Wix down: leave the existing cache untouched and report why.
    return json({ ok: false, error: String((e as any)?.message ?? e) });
  }
});
