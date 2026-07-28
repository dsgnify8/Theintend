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
  created_at: string;
};

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
export async function createBooking(input: {
  refId: string;
  kind: 'class' | 'program' | 'service';
  title: string;
  when: string;
  expert?: string;
  expertId?: string | null;
  packageId?: string | null;
  sessionNo?: number | null;
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
      const t = parseWhen(input.when);
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
          addBooking({ refId: b.ref_id, kind: b.kind as any, title: b.title, when: b.when_text, expert: b.expert_name ?? '', expertId: b.expert_id, link: (b as any).link ?? undefined });
        }
      } catch {}
    })();
  }, []);
}
