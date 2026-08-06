// In-session store for saves, likes, reading progress and bookings, plus
// PERSISTED reading activity (article reads + worksheets completed) used for the
// reading streak. Reads/worksheets survive app restarts via AsyncStorage.

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type Booking = {
  refId: string;
  kind: 'class' | 'program' | 'service';
  expertId?: string | null;
  title: string;
  when: string;
  expert: string;
  link?: string;
  // Carried from the database row so a booking can be moved from this screen.
  // Absent on anything written before rescheduling existed.
  id?: string;
  startsAt?: string | null;
  status?: string | null;
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
// How far through a book, 0 to 1. The offset alone says nothing without it.
let bookPct: Record<string, number> = {};
let journalDays: number[] = [];

const READS_KEY = 'intend.reads.v1';
const WORK_KEY = 'intend.worksheets.v1';
const LISTEN_KEY = 'intend.listens.v1';
const LASTREAD_KEY = 'intend.lastread.v1';
const SCROLL_KEY = 'intend.bookscroll.v1';
const BOOKPCT_KEY = 'intend.bookpct.v1';
const JOURNAL_KEY = 'intend.journaldays.v1';
const SAVED_KEY = 'intend.saved.v1';
const LIKED_KEY = 'intend.liked.v1';

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
    const bp = await AsyncStorage.getItem(BOOKPCT_KEY);
    if (bp) bookPct = JSON.parse(bp);
    const jd = await AsyncStorage.getItem(JOURNAL_KEY);
    if (jd) journalDays = JSON.parse(jd);
    const sv = await AsyncStorage.getItem(SAVED_KEY);
    if (sv) savedIds = JSON.parse(sv);
    const lk = await AsyncStorage.getItem(LIKED_KEY);
    if (lk) likedIds = JSON.parse(lk);
  } catch {}
  emit();
})();

function dayKey(t: number) {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export async function clearAllUserData() {
  savedIds = [];
  likedIds = [];
  progressMap = {};
  lastReadId = null;
  bookings = [];
  reads = [];
  worksheetsDone = [];
  listens = [];
  lastRead = null;
  bookScroll = {};
  bookPct = {};
  journalDays = [];
  try {
    await AsyncStorage.multiRemove([
      READS_KEY, WORK_KEY, LISTEN_KEY, LASTREAD_KEY, SCROLL_KEY, BOOKPCT_KEY, JOURNAL_KEY, SAVED_KEY, LIKED_KEY,
      // Kept in lib/mood.ts as MOOD_HIDE_KEY. Named here so account deletion
      // leaves nothing behind.
      'intend.mood.answeredAt',
      // Kept in lib/notificationsFeed.ts as NOTIFS_SEEN_KEY.
      'intend.notifs.seen.v1',
    ]);
  } catch {}
  emit();
}

// --- Account copy of saved and liked ---
// The device stays the source of truth for what is on screen, so a tap is
// instant and works offline. These writes run behind that and are allowed to
// fail quietly: the local copy is still correct either way.

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function pushItem(id: string, kind: 'saved' | 'liked', on: boolean) {
  const uid = await currentUserId();
  if (!uid) return; // signed out: the device copy is all there is
  try {
    if (on) {
      await supabase.from('user_items').upsert(
        { user_id: uid, item_id: id, kind },
        { onConflict: 'user_id,item_id,kind' },
      );
    } else {
      await supabase.from('user_items').delete().eq('user_id', uid).eq('item_id', id).eq('kind', kind);
    }
  } catch {}
}

// Merges the account copy into whatever is on the device. Union rather than
// replace, so anything saved while signed out is kept and pushed up.
export async function hydrateUserItems() {
  const uid = await currentUserId();
  if (!uid) return;
  try {
    const { data } = await supabase.from('user_items').select('item_id,kind').eq('user_id', uid);
    const rows = (data as { item_id: string; kind: string }[]) ?? [];
    const remoteSaved = rows.filter((r) => r.kind === 'saved').map((r) => r.item_id);
    const remoteLiked = rows.filter((r) => r.kind === 'liked').map((r) => r.item_id);

    const localOnlySaved = savedIds.filter((x) => !remoteSaved.includes(x));
    const localOnlyLiked = likedIds.filter((x) => !remoteLiked.includes(x));

    savedIds = Array.from(new Set([...remoteSaved, ...savedIds]));
    likedIds = Array.from(new Set([...remoteLiked, ...likedIds]));
    AsyncStorage.setItem(SAVED_KEY, JSON.stringify(savedIds)).catch(() => {});
    AsyncStorage.setItem(LIKED_KEY, JSON.stringify(likedIds)).catch(() => {});
    emit();

    for (const id of localOnlySaved) pushItem(id, 'saved', true);
    for (const id of localOnlyLiked) pushItem(id, 'liked', true);
  } catch {}
}

// Pull the account copy on load and whenever someone signs in.
hydrateUserItems();
try {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
      hydrateUserItems();
    }
  });
} catch {}

export function toggleSaved(id: string) {
  const on = !savedIds.includes(id);
  savedIds = on ? [...savedIds, id] : savedIds.filter((x) => x !== id);
  AsyncStorage.setItem(SAVED_KEY, JSON.stringify(savedIds)).catch(() => {});
  emit();
  pushItem(id, 'saved', on);
}
export function isSaved(id: string) { return savedIds.includes(id); }

export function toggleLiked(id: string) {
  const on = !likedIds.includes(id);
  likedIds = on ? [...likedIds, id] : likedIds.filter((x) => x !== id);
  AsyncStorage.setItem(LIKED_KEY, JSON.stringify(likedIds)).catch(() => {});
  emit();
  pushItem(id, 'liked', on);
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
  // Matched on the row id where there is one. Matching on the time text would
  // treat a moved booking as a new one and show it twice, at both times.
  const at = b.id
    ? bookings.findIndex((x) => x.id === b.id)
    : bookings.findIndex((x) => x.refId === b.refId && x.when === b.when);

  if (at === -1) {
    bookings = [...bookings, b];
    emit();
    return;
  }
  // Replace rather than skip, so a time that has changed lands here.
  const existing = bookings[at];
  if (existing.when === b.when && existing.status === b.status && existing.link === b.link) return;
  bookings = bookings.map((x, i) => (i === at ? { ...x, ...b } : x));
  emit();
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

const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function bookingTime(b: Booking): number | null {
  const m = (b.when || '').match(/(\d{1,2}) (\w{3}) (\d{4}), (\d{1,2}):(\d{2}) (AM|PM)/);
  if (!m) return null;
  const mon = MON3.indexOf(m[2]);
  if (mon < 0) return null;
  let hr = parseInt(m[4], 10) % 12;
  if (m[6] === 'PM') hr += 12;
  return new Date(parseInt(m[3], 10), mon, parseInt(m[1], 10), hr, parseInt(m[5], 10)).getTime();
}
// Bookings that are still ahead of us, soonest first. Undated (class/program) go last.
export const useUpcomingBookings = () => useStore(() => {
  const now = Date.now();
  const withT = bookings.map((b) => ({ b, t: bookingTime(b) }));
  const kept = withT.filter((x) => x.t == null || x.t >= now - 3600000);
  kept.sort((a, c) => {
    if (a.t == null && c.t == null) return 0;
    if (a.t == null) return 1;
    if (c.t == null) return -1;
    return a.t - c.t;
  });
  return kept.map((x) => x.b);
});
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

export function saveBookPct(id: string, pct: number) {
  const next = Math.min(1, Math.max(0, pct));
  if (Math.abs((bookPct[id] ?? 0) - next) < 0.01) return; // not worth a write
  bookPct = { ...bookPct, [id]: next };
  AsyncStorage.setItem(BOOKPCT_KEY, JSON.stringify(bookPct)).catch(() => {});
  emit();
}
export function getBookPct(id: string) { return bookPct[id] ?? 0; }
export const useBookPct = () => useStore(() => ({ ...bookPct }));
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
    if (!days.has(dayKey(cursor))) cursor -= oneDay; // today not read yet, so do not break the streak
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
