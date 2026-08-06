// Persisted bookings. Writes to Supabase (when signed in) and mirrors class/program
// bookings into the in-session store so they show instantly under You.

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { addBooking } from './store';
import { scheduleLocalReminder } from './notifications';

export type DBBooking = {
  id: string;
  kind: string;
  ref_id: string;
  expert_id: string | null;
  expert_name: string | null;
  title: string;
  when_text: string;
  booker_name: string | null;
  booker_email: string | null;
  link?: string | null;
  package_id?: string | null;
  session_no?: number | null;
  // Absolute instant of the session. when_text is a local clock string with no
  // zone, so starts_at is the only value that means the same thing on every
  // device. Null on rows written before this existed.
  starts_at?: string | null;
  duration_minutes?: number | null;
  timezone?: string | null;
  service_id?: string | null;
  status?: string | null;
  created_at: string;
  rescheduled_at?: string | null;
  rescheduled_by?: string | null;
  reschedule_count?: number | null;
};

// --- Moving a booking ---
// There is no cancel here on purpose. A booking is moved, never removed, and
// moving updates the row that already exists. That is what keeps a package
// session counted once however many times the time changes.

export const CHANGE_CUTOFF_MS = 12 * 60 * 60 * 1000;
export const CONFIRM_WITHIN_MS = 24 * 60 * 60 * 1000;

export type ChangeCheck =
  | { allowed: true; confirmNeeded: boolean; hoursAway: number }
  | { allowed: false; reason: string };

// Whether this booking can still be moved from inside the app, and whether to
// ask first.
export function canChangeTime(b: { starts_at?: string | null; when_text?: string | null }): ChangeCheck {
  const at = bookingStartMs(b);
  if (at == null) {
    // No absolute time to measure against, so the team handles it.
    return { allowed: false, reason: 'This one does not have a set time yet. Message us and we will sort it.' };
  }
  const left = at - Date.now();
  if (left <= 0) {
    return { allowed: false, reason: 'This session has already started.' };
  }
  if (left < CHANGE_CUTOFF_MS) {
    return { allowed: false, reason: 'This is less than 12 hours away, so it cannot be moved here. Message us and we will help.' };
  }
  return {
    allowed: true,
    confirmNeeded: left < CONFIRM_WITHIN_MS,
    hoursAway: Math.round(left / (60 * 60 * 1000)),
  };
}

export function needsNewTime(b: { status?: string | null }): boolean {
  return b?.status === 'awaiting_reschedule';
}

// The expert cannot make it. The booking stays exactly where it is, still
// counted, and the client is asked to choose again.
export async function requestReschedule(bookingId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'awaiting_reschedule',
      rescheduled_at: new Date().toISOString(),
      rescheduled_by: 'expert',
    })
    .eq('id', bookingId);
  // The caller refreshes its own list. There is no module level reload here,
  // only the one each hook returns.
  return { error };
}

// A new time has been chosen. This updates rather than inserts, which is the
// whole reason package counts stay right.
export async function applyNewTime(
  bookingId: string,
  opts: {
    startsAt: Date;
    whenText: string;
    durationMin?: number;
    timezone?: string;
    by: 'expert' | 'client';
    previousCount?: number | null;
  },
): Promise<{ error: any }> {
  const patch: Record<string, any> = {
    starts_at: opts.startsAt.toISOString(),
    when_text: opts.whenText,
    status: 'confirmed',
    rescheduled_at: new Date().toISOString(),
    rescheduled_by: opts.by,
    reschedule_count: (opts.previousCount ?? 0) + 1,
  };
  if (opts.durationMin) patch.duration_minutes = opts.durationMin;
  if (opts.timezone) patch.timezone = opts.timezone;

  const { error } = await supabase.from('bookings').update(patch).eq('id', bookingId);
  return { error };
}

// The instant a booking starts, in ms. Prefers the absolute column and falls
// back to reading when_text in the local clock for older rows.
export function bookingStartMs(b: { starts_at?: string | null; when_text?: string | null }): number | null {
  if (b?.starts_at) {
    const t = new Date(b.starts_at).getTime();
    if (!isNaN(t)) return t;
  }
  return parseWhen(b?.when_text || '');
}

const MON3B = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function parseWhen(w: string): number | null {
  const m = (w || '').match(/(\d{1,2}) (\w{3}) (\d{4}), (\d{1,2}):(\d{2}) (AM|PM)/);
  if (!m) return null;
  const mon = MON3B.indexOf(m[2]);
  if (mon < 0) return null;
  let hr = parseInt(m[4], 10) % 12;
  if (m[6] === 'PM') hr += 12;
  return new Date(parseInt(m[3], 10), mon, parseInt(m[1], 10), hr, parseInt(m[5], 10)).getTime();
}
// --- Showing a booking time ---
// Always formatted from starts_at, which is an absolute instant, so each
// person sees their own clock. when_text is only a fallback for rows written
// before starts_at existed.

const WD3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function clockLabel(h: number, m: number) {
  const hh = ((h + 11) % 12) + 1;
  const mm = m < 10 ? '0' + m : String(m);
  return hh + ':' + mm + ' ' + (h < 12 ? 'AM' : 'PM');
}

type WhenLike = { starts_at?: string | null; when_text?: string | null; timezone?: string | null };

export function formatWhenLocal(b: WhenLike): string {
  if (!b?.starts_at) return b?.when_text ?? '';
  const d = new Date(b.starts_at);
  if (isNaN(d.getTime())) return b?.when_text ?? '';
  return WD3[d.getDay()] + ', ' + d.getDate() + ' ' + MON3B[d.getMonth()] + ' ' + d.getFullYear() + ', ' + clockLabel(d.getHours(), d.getMinutes());
}

// "Europe/Stockholm" reads better as "Stockholm".
export function zoneCity(tz?: string | null): string | null {
  if (!tz) return null;
  const part = tz.split('/').pop();
  return part ? part.replace(/_/g, ' ') : null;
}

function timeInZone(iso: string, tz: string): string | null {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz,
    }).format(d);
  } catch {
    return null;
  }
}

// For expert-facing screens: their own time, plus the client's when it differs.
export function formatWhenForExpert(b: WhenLike): string {
  const mine = formatWhenLocal(b);
  const tz = b?.timezone;
  if (!tz || !b?.starts_at) return mine;
  try {
    const here = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!here || here === tz) return mine;
  } catch {
    return mine;
  }
  const theirs = timeInZone(b.starts_at, tz);
  const city = zoneCity(tz);
  if (!theirs || !city) return mine;
  return mine + ' (' + theirs + ' in ' + city + ')';
}

export async function createBooking(input: {
  refId: string;
  kind: 'class' | 'program' | 'service';
  title: string;
  when: string;
  expert?: string;
  expertId?: string | null;
  packageId?: string | null;
  sessionNo?: number | null;
  startsAt?: Date | null;
  durationMin?: number | null;
  timezone?: string | null;
  serviceId?: string | null;
}) {
  // Instant local mirror for class/program (so You updates immediately, even signed out).
  addBooking({
    refId: input.refId,
    kind: input.kind,
    title: input.title,
    when: input.when,
    expert: input.expert ?? '',
    expertId: input.expertId ?? null,
  });
  try {
    const { data: u } = await supabase.auth.getUser();
    const userId = u?.user?.id;
    const email = u?.user?.email ?? null;
    if (!userId) return { error: null, id: null }; // not signed in: local mirror only
    let name: string | null = null;
    try {
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle();
      name = p?.full_name ?? null;
    } catch {}
    const { error } = await supabase.from('bookings').insert({
      user_id: userId,
      kind: input.kind,
      ref_id: input.refId,
      expert_id: input.expertId ?? null,
      expert_name: input.expert ?? null,
      title: input.title,
      when_text: input.when,
      booker_name: name,
      booker_email: email,
      package_id: input.packageId ?? null,
      session_no: input.sessionNo ?? null,
      starts_at: input.startsAt ? input.startsAt.toISOString() : null,
      duration_minutes: input.durationMin ?? null,
      timezone: input.timezone ?? null,
      service_id: input.serviceId ?? null,
    });

    // Best effort read back of the row we just wrote, so a paid order can
    // record which booking it produced. Wrapped so it can never affect the
    // booking itself.
    let newId: string | null = null;
    if (!error) {
      try {
        const { data: row } = await supabase
          .from('bookings')
          .select('id')
          .eq('user_id', userId)
          .eq('ref_id', input.refId)
          .eq('when_text', input.when)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        newId = (row as any)?.id ?? null;
      } catch {}
    }
    try {
      const t = input.startsAt ? input.startsAt.getTime() : parseWhen(input.when);
      if (t) {
        await scheduleLocalReminder(`rem24-${input.refId}-${t}`, 'Session tomorrow', `${input.title} is coming up.`, new Date(t - 86400000));
        await scheduleLocalReminder(`rem1-${input.refId}-${t}`, 'Session soon', `${input.title} starts in about an hour.`, new Date(t - 3600000));
      }
    } catch {}
    return { error, id: newId };
  } catch (e: any) {
    return { error: e, id: null };
  }
}

export function useMyBookings() {
  const [items, setItems] = useState<DBBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) { setItems([]); setLoading(false); return; }
      const { data } = await supabase.from('bookings').select('*').eq('user_id', uid).order('created_at', { ascending: false });
      setItems((data as DBBooking[]) ?? []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  return { items, loading, reload: load };
}

export function useExpertBookings(expertId?: string) {
  const [items, setItems] = useState<DBBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    if (!expertId) { setItems([]); setLoading(false); return; }
    try {
      const { data } = await supabase.from('bookings').select('*').eq('expert_id', expertId).order('created_at', { ascending: false });
      setItems((data as DBBooking[]) ?? []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, [expertId]);
  return { items, loading, reload: load };
}

// Loads the signed-in user's class/program bookings into the local store once,
// so persisted bookings appear under You across sessions.
export async function getBookingById(id: string) {
  try {
    const { data } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();
    return (data as DBBooking) ?? null;
  } catch { return null; }
}
export async function setBookingLink(id: string, link: string) {
  try {
    const { error } = await supabase.from('bookings').update({ link }).eq('id', id);
    return { error };
  } catch (e: any) { return { error: e }; }
}

export function useHydrateBookings() {
  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        if (!uid) return;
        const { data } = await supabase.from('bookings').select('*').eq('user_id', uid).in('kind', ['class', 'program', 'service']);
        for (const b of (data as DBBooking[]) ?? []) {
          addBooking({
            refId: b.ref_id,
            kind: b.kind as any,
            title: b.title,
            when: b.when_text,
            expert: b.expert_name ?? '',
            expertId: b.expert_id,
            link: (b as any).link ?? undefined,
            // The three the mirror was dropping.
            id: b.id,
            startsAt: b.starts_at ?? null,
            status: b.status ?? null,
          });
        }
      } catch {}
    })();
  }, []);
}
