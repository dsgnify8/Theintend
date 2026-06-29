// In-session store: saves, likes, reading progress and bookings.
// Real persistence (your account, across devices) comes when we connect Supabase.

import { useEffect, useState } from 'react';

export type Booking = {
  refId: string;
  kind: 'class' | 'program';
  title: string;
  when: string;
  expert: string;
};

let savedIds: string[] = [];
let likedIds: string[] = [];
let progressMap: Record<string, number> = {};
let lastReadId: string | null = null;
let bookings: Booking[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function toggleSaved(id: string) {
  savedIds = savedIds.includes(id) ? savedIds.filter((x) => x !== id) : [...savedIds, id];
  emit();
}
export function isSaved(id: string) {
  return savedIds.includes(id);
}

export function toggleLiked(id: string) {
  likedIds = likedIds.includes(id) ? likedIds.filter((x) => x !== id) : [...likedIds, id];
  emit();
}
export function isLiked(id: string) {
  return likedIds.includes(id);
}

export function setProgress(id: string, pct: number) {
  const cur = progressMap[id] ?? 0;
  progressMap[id] = Math.min(1, Math.max(cur, pct));
  lastReadId = id;
  emit();
}
export function getProgress(id: string) {
  return progressMap[id] ?? 0;
}

export function addBooking(b: Booking) {
  if (!bookings.some((x) => x.refId === b.refId)) {
    bookings = [...bookings, b];
    emit();
  }
}

function useStore<T>(getter: () => T): T {
  const [v, setV] = useState<T>(getter);
  useEffect(() => {
    const l = () => setV(getter());
    listeners.add(l);
    l();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return v;
}

export const useSaved = () => useStore(() => [...savedIds]);
export const useLiked = () => useStore(() => [...likedIds]);
export const useProgress = () => useStore(() => ({ map: { ...progressMap }, lastReadId }));
export const useBookings = () => useStore(() => [...bookings]);
