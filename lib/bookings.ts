// Persisted bookings. Writes to Supabase (when signed in) and mirrors class/program
// bookings into the in-session store so they show instantly under You.

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { addBooking } from './store';

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
  created_at: string;
};

export async function createBooking(input: {
  refId: string;
  kind: 'class' | 'program' | 'service';
  title: string;
  when: string;
  expert?: string;
  expertId?: string | null;
}) {
  // Instant local mirror for class/program (so You updates immediately, even signed out).
  if (input.kind !== 'service') {
    addBooking({
      refId: input.refId,
      kind: input.kind,
      title: input.title,
      when: input.when,
      expert: input.expert ?? '',
    });
  }
  try {
    const { data: u } = await supabase.auth.getUser();
    const userId = u?.user?.id;
    const email = u?.user?.email ?? null;
    if (!userId) return { error: null }; // not signed in: local mirror only
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
    });
    return { error };
  } catch (e: any) {
    return { error: e };
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
export function useHydrateBookings() {
  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        if (!uid) return;
        const { data } = await supabase.from('bookings').select('*').eq('user_id', uid).in('kind', ['class', 'program']);
        for (const b of (data as DBBooking[]) ?? []) {
          addBooking({ refId: b.ref_id, kind: b.kind as 'class' | 'program', title: b.title, when: b.when_text, expert: b.expert_name ?? '' });
        }
      } catch {}
    })();
  }, []);
}
