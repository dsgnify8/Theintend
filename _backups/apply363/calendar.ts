import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

export type CalStatus = { connected: boolean; email: string | null };

export async function getCalendarStatus(expertId: string): Promise<CalStatus> {
  const { data } = await supabase.rpc('get_calendar_status', { p_expert: expertId });
  const row = Array.isArray(data) ? data[0] : null;
  return row ? { connected: true, email: row.google_email ?? null } : { connected: false, email: null };
}

export async function connectCalendar(expertId: string): Promise<boolean> {
  const returnUrl = Linking.createURL('calendar-connected');
  const { data, error } = await supabase.functions.invoke('calendar-connect-start', {
    body: { expertId, appReturnUrl: returnUrl },
  });
  if (error || !data?.url) throw new Error(error?.message ?? 'Could not start the connection.');
  const res = await WebBrowser.openAuthSessionAsync(data.url as string, returnUrl);
  return res.type === 'success';
}

export async function disconnectCalendar(expertId: string): Promise<void> {
  await supabase.functions.invoke('calendar-disconnect', { body: { expertId } });
}

export type BusyInterval = { start: string; end: string };

// Reads the expert's Google free/busy for a time range via the deployed
// `calendar-busy` edge function. Returns empty when not connected.
export async function getCalendarBusy(
  expertId: string,
  timeMin: string,
  timeMax: string,
): Promise<{ connected: boolean; busy: BusyInterval[] }> {
  try {
    const { data, error } = await supabase.functions.invoke('calendar-busy', {
      body: { expertId, timeMin, timeMax },
    });
    if (error || !data) return { connected: false, busy: [] };
    return { connected: !!data.connected, busy: Array.isArray(data.busy) ? data.busy : [] };
  } catch {
    return { connected: false, busy: [] };
  }
}

// Writes a booking onto the expert's Google Calendar via the deployed
// `calendar-create-event` function. Best-effort; makes the slot show as busy
// so it disappears for the next client.
export async function createCalendarEvent(input: {
  expertId: string;
  summary: string;
  description?: string;
  startIso: string;
  endIso: string;
  attendeeEmail?: string;
}): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('calendar-create-event', { body: input });
    if (error || !data) return false;
    return !!data.connected;
  } catch {
    return false;
  }
}

