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

