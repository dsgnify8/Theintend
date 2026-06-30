import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { MOOD_RECO, MOODS, type MoodKey } from '@/constants/mood';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export type MoodEntry = { day: string; mood: MoodKey };

// One check-in per day; saving again overwrites today's.
export async function setMoodToday(mood: MoodKey) {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return { error: { message: 'Not signed in' } };
  const { error } = await supabase
    .from('moods')
    .upsert({ user_id: u.user.id, day: todayKey(), mood }, { onConflict: 'user_id,day' });
  return { error };
}

export function useTodayMood() {
  const [mood, setMood] = useState<MoodKey | null>(null);
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      const { data } = await supabase
        .from('moods')
        .select('mood')
        .eq('user_id', u.user.id)
        .eq('day', todayKey())
        .limit(1);
      if (data && data[0]?.mood) setMood(data[0].mood as MoodKey);
    })();
  }, []);
  return mood;
}

export function useMoodHistory(windowDays = 14) {
  const [state, setState] = useState<{ entries: MoodEntry[]; loading: boolean }>({ entries: [], loading: true });
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { setState({ entries: [], loading: false }); return; }
      const since = new Date(Date.now() - windowDays * 86400000).toISOString().slice(0, 10);
      const { data } = await supabase
        .from('moods')
        .select('day,mood')
        .eq('user_id', u.user.id)
        .gte('day', since)
        .order('day', { ascending: false });
      setState({ entries: (data ?? []) as MoodEntry[], loading: false });
    })();
  }, [windowDays]);
  return state;
}

// Most frequent mood across the window wins.
export function dominantMood(entries: MoodEntry[]): MoodKey | null {
  if (!entries.length) return null;
  const counts: Record<string, number> = {};
  for (const e of entries) counts[e.mood] = (counts[e.mood] ?? 0) + 1;
  let best: string | null = null;
  let n = -1;
  for (const k of Object.keys(counts)) {
    if (counts[k] > n) { n = counts[k]; best = k; }
  }
  return best as MoodKey;
}

export type RecoKind = 'expert' | 'article' | 'sound';

export type MoodInsight = {
  ready: boolean;
  loading: boolean;
  mood: MoodKey | null;
  daysLogged: number;
  recoKind: RecoKind | null;
};

// Insight appears once at least `minDays` have been logged.
export function useMoodInsight(minDays = 3, windowDays = 14): MoodInsight {
  const { entries, loading } = useMoodHistory(windowDays);
  const daysLogged = entries.length; // one row per day
  const mood = dominantMood(entries);
  const ready = !loading && daysLogged >= minDays && !!mood;
  // Rotate which kind we lead with as more days are logged.
  const recoKind: RecoKind | null = ready ? (['expert', 'article', 'sound'] as const)[daysLogged % 3] : null;
  return { ready, loading, mood, daysLogged, recoKind };
}

// Find a live article that fits a mood, by category or keyword.
export function pickArticleForMood(mood: MoodKey, articles: any[]): any | null {
  const r = MOOD_RECO[mood];
  if (!articles?.length) return null;
  const kw = r.articleKeywords.map((k) => k.toLowerCase());
  const byKeyword = articles.find((a) => {
    const hay = `${a.title ?? ''} ${a.excerpt ?? ''}`.toLowerCase();
    return kw.some((k) => hay.includes(k));
  });
  if (byKeyword) return byKeyword;
  const byCat = articles.find((a) => r.articleCategories.includes(a.category));
  return byCat ?? articles[0] ?? null;
}

export { MOOD_RECO, MOODS };

