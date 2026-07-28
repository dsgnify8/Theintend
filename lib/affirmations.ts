// Affirmations data layer for the "I Am" experience.
// Onboarding answers -> a generated batch (server) -> the scroll reads from here.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type Category = { id: string; label: string; tone: string; sort: number };
export type Affirmation = { id: string; category: string; text: string; liked: boolean };
export type AffProfile = {
  focus_areas: string[];
  context: string | null;
  state: string | null;
  states: string[];
  notify: boolean;
  notify_hour: number | null;
};

export const STATES: { id: string; label: string }[] = [
  { id: 'loved', label: 'I want to feel loved and seen' },
  { id: 'confidence', label: 'I want confidence and self-belief' },
  { id: 'abundance', label: 'I want money and abundance' },
  { id: 'calm', label: 'I want calm and steadiness' },
  { id: 'release', label: 'I want to release what holds me back' },
  { id: 'alive', label: 'I want to feel free and alive' },
];

// Map the onboarding "where are you" answer to the category the scroll opens on.
export const STATE_TO_CATEGORY: Record<string, string> = {
  loved: 'self-love',
  confidence: 'confidence',
  abundance: 'abundance',
  calm: 'calm',
  release: 'letting-go',
  alive: 'purpose',
};

export async function getCategories(): Promise<Category[]> {
  const { data } = await supabase.from('affirmation_categories').select('*').order('sort');
  return (data as Category[]) ?? [];
}

// Returns the person's onboarding profile, or null if they have not onboarded.
export async function getAffProfile(userId: string): Promise<AffProfile | null> {
  const { data } = await supabase
    .from('affirmation_profile')
    .select('focus_areas,context,state,states,notify,notify_hour')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as AffProfile) ?? null;
}

export async function saveAffProfile(
  userId: string,
  patch: Partial<AffProfile>,
): Promise<{ error: any }> {
  const row = { user_id: userId, ...patch, updated_at: new Date().toISOString() };
  const { error } = await supabase.from('affirmation_profile').upsert(row, { onConflict: 'user_id' });
  return { error };
}

// Ask the server to generate a batch for a category. Stored server-side.
export async function generateBatch(category: string, count = 30): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('generate-affirmations', {
    body: { category, count },
  });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error ?? 'Could not generate affirmations.' };
  return { ok: true };
}

export async function getAffirmations(userId: string, category: string): Promise<Affirmation[]> {
  const { data } = await supabase
    .from('affirmations')
    .select('id,category,text,liked')
    .eq('user_id', userId)
    .eq('category', category)
    .order('created_at', { ascending: true });
  return (data as Affirmation[]) ?? [];
}

// ---------------------------------------------------------------- shared pool
// The curated library everyone reads from. Public, so it loads without waiting
// on anything being written for this person first.

export const LIB_PREFIX = 'lib:';

export type LibraryRow = { id: string; text: string };

export async function getLibrary(category: string): Promise<LibraryRow[]> {
  try {
    const { data } = await supabase
      .from('affirmation_library')
      .select('id,text')
      .eq('category', category)
      .eq('active', true)
      .order('sort', { ascending: true });
    return (data as LibraryRow[]) ?? [];
  } catch {
    return [];
  }
}

// A stable shuffle: the same person sees the same order every time, different
// people see different orders. No randomness, so nothing jumps between loads.
function shuffleFor<T>(seed: string, list: T[]): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    const j = Math.abs(h) % (i + 1);
    const t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out;
}

// Which pool lines this person has already been shown. Ids are unique across
// the whole library, so there is no need to filter by category here.
export async function getSeenLibraryIds(userId: string): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('affirmation_seen')
      .select('library_id')
      .eq('user_id', userId);
    return ((data as { library_id: string }[]) ?? []).map((r) => r.library_id);
  } catch {
    return [];
  }
}

// Recorded as the person scrolls. Best effort: failing to record simply means
// a line may be shown again.
export async function markLibrarySeen(userId: string, libraryIds: string[]) {
  if (!userId || !libraryIds.length) return;
  try {
    await supabase.from('affirmation_seen').upsert(
      libraryIds.map((id) => ({ user_id: userId, library_id: id })),
      { onConflict: 'user_id,library_id' },
    );
  } catch {}
}

// What the scroll shows: unseen pool lines first, then anything generated for
// them. A line they have already saved a copy of is dropped, so it does not
// appear twice.
export async function loadFeed(userId: string, category: string): Promise<Affirmation[]> {
  const [lib, mine, seenIds] = await Promise.all([
    getLibrary(category),
    getAffirmations(userId, category),
    getSeenLibraryIds(userId),
  ]);
  const mineTexts = new Set(mine.map((m) => m.text));
  const seen = new Set(seenIds);

  let rows = lib.filter((l) => !mineTexts.has(l.text) && !seen.has(l.id));

  // Every line in this category has been shown. If there is nothing generated
  // to fall back on, recycle rather than leave an empty screen. The top-up
  // brings genuinely new lines in behind it.
  if (rows.length === 0 && lib.length > 0 && mine.length === 0) {
    rows = lib.filter((l) => !mineTexts.has(l.text));
  }

  const pool: Affirmation[] = rows.map((l) => ({
    id: LIB_PREFIX + l.id,
    category,
    text: l.text,
    liked: false,
  }));
  // The seen count is part of the seed, so the order shifts as they work
  // through a category rather than settling into one fixed sequence.
  const seed = userId + ':' + category + ':' + seen.size;
  return [...shuffleFor(seed, pool), ...mine];
}

// Liking works for both kinds. A pool line has no row of its own yet, so the
// first like writes a personal copy and returns its real id for the caller to
// swap in. Unliking a pool line that was never saved is a no-op.
export async function likeItem(
  userId: string,
  item: Affirmation,
  liked: boolean,
): Promise<string> {
  if (!item.id.startsWith(LIB_PREFIX)) {
    await toggleLike(item.id, liked);
    return item.id;
  }
  if (!liked) return item.id;
  try {
    const { data } = await supabase
      .from('affirmations')
      .insert({ user_id: userId, category: item.category, text: item.text, liked: true })
      .select('id')
      .maybeSingle();
    return (data as any)?.id ?? item.id;
  } catch {
    return item.id;
  }
}

// Loads a category's affirmations, generating a batch first if none exist yet.
export async function loadOrGenerate(userId: string, category: string): Promise<Affirmation[]> {
  let list = await getAffirmations(userId, category);
  if (list.length === 0) {
    const g = await generateBatch(category);
    if (g.ok) list = await getAffirmations(userId, category);
  }
  return list;
}

export async function toggleLike(id: string, liked: boolean): Promise<void> {
  await supabase.from('affirmations').update({ liked }).eq('id', id);
}

export async function getLiked(userId: string): Promise<Affirmation[]> {
  const { data } = await supabase
    .from('affirmations')
    .select('id,category,text,liked')
    .eq('user_id', userId)
    .eq('liked', true)
    .order('created_at', { ascending: false });
  return (data as Affirmation[]) ?? [];
}

// Whether this person has completed onboarding (has a profile with focus areas).
export function useHasOnboarded(userId: string | undefined) {
  const [state, setState] = useState<{ loading: boolean; onboarded: boolean }>({ loading: true, onboarded: false });
  useEffect(() => {
    let alive = true;
    if (!userId) { setState({ loading: false, onboarded: false }); return; }
    getAffProfile(userId)
      .then((p) => { if (alive) setState({ loading: false, onboarded: !!(p && p.focus_areas?.length) }); })
      .catch(() => { if (alive) setState({ loading: false, onboarded: false }); });
    return () => { alive = false; };
  }, [userId]);
  return state;
}

