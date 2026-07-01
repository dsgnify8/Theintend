import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { recordJournalDay } from './store';

export type WorksheetAnswers = Record<string, string>;
export type WorksheetDraft = { answers: WorksheetAnswers; page: number; updatedAt: string };
export type WorksheetEntry = {
  id: string;
  worksheetId: string;
  createdAt: string;
  updatedAt: string;
  answers: WorksheetAnswers;
};

const draftKey = (id: string) => `worksheet:draft:${id}`;
const ENTRIES_KEY = 'worksheet:entries:v1';

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getDraft(worksheetId: string): Promise<WorksheetDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(draftKey(worksheetId));
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p && typeof p === 'object' ? p : null;
  } catch {
    return null;
  }
}

export async function saveDraft(worksheetId: string, answers: WorksheetAnswers, page: number): Promise<void> {
  try {
    await AsyncStorage.setItem(draftKey(worksheetId), JSON.stringify({ answers, page, updatedAt: new Date().toISOString() }));
  } catch {}
}

export async function clearDraft(worksheetId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(draftKey(worksheetId));
  } catch {}
}

export function useDraft(worksheetId: string) {
  const [draft, setDraft] = useState<WorksheetDraft | null>(null);
  const load = useCallback(() => {
    getDraft(worksheetId).then(setDraft);
  }, [worksheetId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return draft;
}

async function readEntries(): Promise<WorksheetEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(ENTRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeEntries(list: WorksheetEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(list));
  } catch {}
}

export async function createWorksheetEntry(worksheetId: string, answers: WorksheetAnswers): Promise<string> {
  const list = await readEntries();
  const now = new Date().toISOString();
  const id = uid();
  list.unshift({ id, worksheetId, createdAt: now, updatedAt: now, answers });
  await writeEntries(list);
  recordJournalDay();
  return id;
}

export async function updateWorksheetEntry(id: string, answers: WorksheetAnswers): Promise<void> {
  const list = await readEntries();
  const idx = list.findIndex((e) => e.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], answers, updatedAt: new Date().toISOString() };
    await writeEntries(list);
  }
}

export async function deleteWorksheetEntry(id: string): Promise<void> {
  const list = await readEntries();
  await writeEntries(list.filter((e) => e.id !== id));
}

export async function getWorksheetEntry(id: string): Promise<WorksheetEntry | null> {
  const list = await readEntries();
  return list.find((e) => e.id === id) ?? null;
}

export function useWorksheetEntries(worksheetId: string) {
  const [entries, setEntries] = useState<WorksheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    readEntries().then((all) => {
      setEntries(all.filter((e) => e.worksheetId === worksheetId));
      setLoading(false);
    });
  }, [worksheetId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return { entries, loading, reload: load };
}

export function useAllWorksheetEntries() {
  const [entries, setEntries] = useState<WorksheetEntry[]>([]);
  const load = useCallback(() => { readEntries().then(setEntries); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return entries;
}
