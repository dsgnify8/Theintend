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
