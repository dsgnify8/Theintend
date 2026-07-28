import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { MOOD_RECO, MOODS, levelForKeyword, type MoodKey } from '@/constants/mood';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export type MoodEntry = { day: string; mood: string };

// Once answered, the picker rests for twelve hours. Stored locally because it
// is a display rule, not data the website or another device needs.
export const MOOD_HIDE_KEY = 'intend.mood.answeredAt';
export const MOOD_HIDE_MS = 12 * 60 * 60 * 1000;

export function useMoodPicker() {
  const [state, setState] = useState<{ checked: boolean; visible: boolean }>({ checked: false, visible: false });
  useEffect(() => {
    let alive = true;
    (async () => {
      let visible = true;
      try {
        const raw = await AsyncStorage.getItem(MOOD_HIDE_KEY);
        const t = raw ? parseInt(raw, 10) : 0;
        if (t && Date.now() - t < MOOD_HIDE_MS) visible = false;
      } catch {}
      if (alive) setState({ checked: true, visible });
    })();
    return () => { alive = false; };
  }, []);
  // Recorded on answering. The card stays up for the rest of this session so
  // keywords can still be added, and does not return until the window passes.
  const markAnswered = () => {
    AsyncStorage.setItem(MOOD_HIDE_KEY, String(Date.now())).catch(() => {});
  };
  return { checked: state.checked, visible: state.visible, markAnswered };
}

// How many days in a row have a check-in, counting back from today, or from
// yesterday when today has not been answered yet.
export function consecutiveDays(entries: MoodEntry[]): number {
  const days = new Set(entries.map((e) => e.day));
  const key = (d: Date) => d.toISOString().slice(0, 10);
  let cursor = new Date();
  if (!days.has(key(cursor))) cursor = new Date(Date.now() - 86400000);
  let n = 0;
  while (days.has(key(cursor))) {
    n++;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return n;
}

// One check-in per day; saving again overwrites today's. `value` is a keyword.
export async function setMoodToday(value: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return { error: { message: 'Not signed in' } };
  const { error } = await supabase
    .from('moods')
    .upsert({ user_id: u.user.id, day: todayKey(), mood: value }, { onConflict: 'user_id,day' });
  return { error };
}

export function useTodayMood() {
  const [mood, setMood] = useState<string | null>(null);
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
      if (data && data[0]?.mood) setMood(data[0].mood as string);
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

// Most frequent LEVEL across the window wins; representative keyword is the
// most common keyword within that level (for the note's wording).
export function dominantLevel(entries: MoodEntry[]): { level: MoodKey | null; keyword: string | null } {
  // Each day may hold several comma-separated keywords; expand them all.
  const kws: string[] = [];
  for (const e of entries) {
    for (const part of (e.mood || '').split(',')) {
      const t = part.trim();
      if (t) kws.push(t);
    }
  }
  if (!kws.length) return { level: null, keyword: null };
  const levelCounts: Record<string, number> = {};
  for (const k of kws) {
    const lv = levelForKeyword(k);
    levelCounts[lv] = (levelCounts[lv] ?? 0) + 1;
  }
  let level: MoodKey | null = null;
  let n = -1;
  for (const k of Object.keys(levelCounts)) {
    if (levelCounts[k] > n) { n = levelCounts[k]; level = k as MoodKey; }
  }
  let keyword: string | null = null;
  if (level) {
    const kwCounts: Record<string, number> = {};
    for (const k of kws) {
      if (levelForKeyword(k) === level) kwCounts[k] = (kwCounts[k] ?? 0) + 1;
    }
    let m = -1;
    for (const k of Object.keys(kwCounts)) {
      if (kwCounts[k] > m) { m = kwCounts[k]; keyword = k; }
    }
    if (!keyword) keyword = MOODS.find((x) => x.key === level)?.label ?? level;
  }
  return { level, keyword };
}

export type RecoKind = 'expert' | 'article' | 'sound';

export type MoodInsight = {
  ready: boolean;
  loading: boolean;
  level: MoodKey | null;
  keyword: string | null;
  daysLogged: number;
  streak: number;
  recoKind: RecoKind | null;
};

// minConsecutiveDays is days in a row, not entries in the window. Two days
// running says more about how someone is doing than three scattered days.
export function useMoodInsight(minConsecutiveDays = 2, windowDays = 14): MoodInsight {
  const { entries, loading } = useMoodHistory(windowDays);
  const daysLogged = entries.length;
  const streak = consecutiveDays(entries);
  const { level, keyword } = dominantLevel(entries);
  const ready = !loading && streak >= minConsecutiveDays && !!level;
  const recoKind: RecoKind | null = ready ? (['expert', 'article', 'sound'] as const)[daysLogged % 3] : null;
  return { ready, loading, level, keyword, daysLogged, streak, recoKind };
}

// Find a live article that fits a level, by keyword then category.
export function pickArticleForMood(level: MoodKey, articles: any[]): any | null {
  const r = MOOD_RECO[level];
  if (!r || !articles?.length) return null;
  const kw = r.articleKeywords.map((k) => k.toLowerCase());
  const byKeyword = articles.find((a) => {
    const hay = `${a.title ?? ''} ${a.excerpt ?? ''}`.toLowerCase();
    return kw.some((k) => hay.includes(k));
  });
  if (byKeyword) return byKeyword;
  const byCat = articles.find((a) => r.articleCategories.includes(a.category));
  return byCat ?? articles[0] ?? null;
}

export { MOOD_RECO, MOODS, levelForKeyword };

