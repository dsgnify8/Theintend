import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { recordJournalDay } from './store';

export type JournalItem = { prompt: string; answer: string };
export type JournalEntry = {
  id: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
  items: JournalItem[];
};

const ENTRIES_KEY = 'journal:entries:v1';
const CHALLENGE_KEY = 'journal:challenge:v1';
const draftKey = (id: string) => `journal:draft:${id}`;

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readAll(): Promise<JournalEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(ENTRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(list: JournalEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(list));
  } catch {}
}

// Each save is a fresh, dated page, so old entries stay untouched.
export async function createEntry(categoryId: string, items: JournalItem[]): Promise<string> {
  const list = await readAll();
  const now = new Date().toISOString();
  const id = uid();
  list.unshift({ id, categoryId, createdAt: now, updatedAt: now, items });
  await writeAll(list);
  recordJournalDay();
  return id;
}

export async function updateEntry(id: string, items: JournalItem[]): Promise<void> {
  const list = await readAll();
  const idx = list.findIndex((e) => e.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], items, updatedAt: new Date().toISOString() };
    await writeAll(list);
  }
}

export async function deleteEntry(id: string): Promise<void> {
  const list = await readAll();
  await writeAll(list.filter((e) => e.id !== id));
}

export async function getEntry(id: string): Promise<JournalEntry | null> {
  const list = await readAll();
  return list.find((e) => e.id === id) ?? null;
}

export function useCategoryEntries(categoryId: string) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    readAll().then((all) => {
      setEntries(all.filter((e) => e.categoryId === categoryId));
      setLoading(false);
    });
  }, [categoryId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return { entries, loading, reload: load };
}

export function useEntryCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const load = useCallback(() => {
    readAll().then((all) => {
      const c: Record<string, number> = {};
      for (const e of all) c[e.categoryId] = (c[e.categoryId] ?? 0) + 1;
      setCounts(c);
    });
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return counts;
}

// All entries newest-first, for the progress screen.
export function useAllJournalEntries() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const load = useCallback(() => { readAll().then(setEntries); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return entries;
}

// ---- per-page draft: autosaves as you type, keyed by prompt text ---------
export type JournalDraftMap = Record<string, string>;

export async function getJournalDraft(categoryId: string): Promise<JournalDraftMap> {
  try {
    const raw = await AsyncStorage.getItem(draftKey(categoryId));
    if (!raw) return {};
    const p = JSON.parse(raw);
    return p && typeof p === 'object' ? p : {};
  } catch {
    return {};
  }
}

export async function saveJournalDraft(categoryId: string, map: JournalDraftMap): Promise<void> {
  try {
    await AsyncStorage.setItem(draftKey(categoryId), JSON.stringify(map));
  } catch {}
}

export async function clearJournalDraft(categoryId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(draftKey(categoryId));
  } catch {}
}

// ---- 30-day challenge: one editable page per day -------------------------
export type ChallengeDay = { text: string; updatedAt: string };
export type ChallengeData = Record<string, ChallengeDay>;

export async function getChallenge(): Promise<ChallengeData> {
  try {
    const raw = await AsyncStorage.getItem(CHALLENGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveChallengeDay(day: number, text: string): Promise<void> {
  const data = await getChallenge();
  data[String(day)] = { text, updatedAt: new Date().toISOString() };
  try {
    await AsyncStorage.setItem(CHALLENGE_KEY, JSON.stringify(data));
  } catch {}
  if (text.trim().length > 0) recordJournalDay();
}

export function useChallenge() {
  const [data, setData] = useState<ChallengeData>({});
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    getChallenge().then((d) => { setData(d); setLoading(false); });
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return { data, loading, reload: load };
}
