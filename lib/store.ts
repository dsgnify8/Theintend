// In-session store for saves, likes, reading progress and bookings, plus
// PERSISTED reading activity (article reads + worksheets completed) used for the
// reading streak. Reads/worksheets survive app restarts via AsyncStorage.

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Booking = {
  refId: string;
  kind: 'class' | 'program';
  title: string;
  when: string;
  expert: string;
  link?: string;
};

let savedIds: string[] = [];
let likedIds: string[] = [];
let progressMap: Record<string, number> = {};
let lastReadId: string | null = null;
let bookings: Booking[] = [];

let reads: { id: string; t: number }[] = [];
let worksheetsDone: string[] = [];
let listens: { id: string; t: number }[] = [];
let lastRead: { id: string; title: string; t: number } | null = null;
let bookScroll: Record<string, number> = {};
let journalDays: number[] = [];

const READS_KEY = 'intend.reads.v1';
const WORK_KEY = 'intend.worksheets.v1';
const LISTEN_KEY = 'intend.listens.v1';
const LASTREAD_KEY = 'intend.lastread.v1';
const SCROLL_KEY = 'intend.bookscroll.v1';
const JOURNAL_KEY = 'intend.journaldays.v1';

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

// Hydrate persisted activity on load
(async () => {
  try {
    const r = await AsyncStorage.getItem(READS_KEY);
    if (r) reads = JSON.parse(r);
    const w = await AsyncStorage.getItem(WORK_KEY);
    if (w) worksheetsDone = JSON.parse(w);
    const ls = await AsyncStorage.getItem(LISTEN_KEY);
    if (ls) listens = JSON.parse(ls);
    const lr = await AsyncStorage.getItem(LASTREAD_KEY);
    if (lr) lastRead = JSON.parse(lr);
    const bs = await AsyncStorage.getItem(SCROLL_KEY);
    if (bs) bookScroll = JSON.parse(bs);
    const jd = await AsyncStorage.getItem(JOURNAL_KEY);
    if (jd) journalDays = JSON.parse(jd);
  } catch {}
  emit();
})();

function dayKey(t: number) {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function toggleSaved(id: string) {
  savedIds = savedIds.includes(id) ? savedIds.filter((x) => x !== id) : [...savedIds, id];
  emit();
}
export function isSaved(id: string) { return savedIds.includes(id); }

export function toggleLiked(id: string) {
  likedIds = likedIds.includes(id) ? likedIds.filter((x) => x !== id) : [...likedIds, id];
  emit();
}
export function isLiked(id: string) { return likedIds.includes(id); }

export function setProgress(id: string, pct: number) {
  const cur = progressMap[id] ?? 0;
  progressMap[id] = Math.min(1, Math.max(cur, pct));
  lastReadId = id;
  emit();
}
export function getProgress(id: string) { return progressMap[id] ?? 0; }

export function addBooking(b: Booking) {
  if (!bookings.some((x) => x.refId === b.refId)) {
    bookings = [...bookings, b];
    emit();
  }
}

// --- Persisted reading activity ---
export function recordRead(id: string) {
  const today = dayKey(Date.now());
  if (reads.some((r) => r.id === id && dayKey(r.t) === today)) return; // once per article per day
  reads = [...reads, { id, t: Date.now() }];
  AsyncStorage.setItem(READS_KEY, JSON.stringify(reads)).catch(() => {});
  emit();
}
export function recordWorksheet(id: string) {
  if (worksheetsDone.includes(id)) return;
  worksheetsDone = [...worksheetsDone, id];
  AsyncStorage.setItem(WORK_KEY, JSON.stringify(worksheetsDone)).catch(() => {});
  emit();
}

export function recordListen(id: string) {
  const today = dayKey(Date.now());
  if (listens.some((r) => r.id === id && dayKey(r.t) === today)) return;
  listens = [...listens, { id, t: Date.now() }];
  AsyncStorage.setItem(LISTEN_KEY, JSON.stringify(listens)).catch(() => {});
  emit();
}

export function recordJournalDay() {
  const today = dayKey(Date.now());
  if (journalDays.some((t) => dayKey(t) === today)) return;
  journalDays = [...journalDays, Date.now()];
  AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(journalDays)).catch(() => {});
  emit();
}
export const useJournalDays = () => useStore(() => [...journalDays]);

function useStore<T>(getter: () => T): T {
  const [v, setV] = useState<T>(getter);
  useEffect(() => {
    const l = () => setV(getter());
    listeners.add(l);
    l();
    return () => { listeners.delete(l); };
  }, []);
  return v;
}

export const useSaved = () => useStore(() => [...savedIds]);
export const useLiked = () => useStore(() => [...likedIds]);
export const useProgress = () => useStore(() => ({ map: { ...progressMap }, lastReadId }));
export const useBookings = () => useStore(() => [...bookings]);
export const useReads = () => useStore(() => [...reads]);
export const useWorksheetsDone = () => useStore(() => [...worksheetsDone]);
export const useListens = () => useStore(() => [...listens]);

export function recordBookOpen(id: string, title: string) {
  lastRead = { id, title, t: Date.now() };
  AsyncStorage.setItem(LASTREAD_KEY, JSON.stringify(lastRead)).catch(() => {});
  emit();
}
export function saveBookScroll(id: string, y: number) {
  bookScroll = { ...bookScroll, [id]: y };
  AsyncStorage.setItem(SCROLL_KEY, JSON.stringify(bookScroll)).catch(() => {});
}
export function getBookScroll(id: string) { return bookScroll[id] ?? 0; }
export function clearLastRead() {
  lastRead = null;
  AsyncStorage.removeItem(LASTREAD_KEY).catch(() => {});
  emit();
}
export const useLastRead = () => useStore(() => lastRead);

// Reading streak: consecutive days (ending today, with a one-day grace) that
// have at least one article read, plus this week's read-days and a record.
export function useReadStreak() {
  return useStore(() => {
    const oneDay = 86400000;
    const days = new Set([...reads.map((r) => dayKey(r.t)), ...journalDays.map((t) => dayKey(t))]);

    let streak = 0;
    let cursor = Date.now();
    if (!days.has(dayKey(cursor))) cursor -= oneDay; // today not read yet — don't break the streak
    while (days.has(dayKey(cursor))) { streak++; cursor -= oneDay; }

    // Longest run (record)
    const toNum = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m, d).getTime(); };
    const nums = Array.from(days).map(toNum).sort((a, b) => a - b);
    let record = 0, run = 0; let prev: number | null = null;
    for (const n of nums) {
      if (prev !== null && n - prev === oneDay) run++; else run = 1;
      record = Math.max(record, run); prev = n;
    }
    record = Math.max(record, streak);

    // This week (Sunday-first): which days had a read
    const now = new Date();
    const sun = new Date(now); sun.setHours(0, 0, 0, 0); sun.setDate(now.getDate() - now.getDay());
    const week: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sun); d.setDate(sun.getDate() + i);
      week.push(days.has(dayKey(d.getTime())));
    }
    return { streak, record, week, todayIndex: now.getDay(), total: reads.length };
  });
}
