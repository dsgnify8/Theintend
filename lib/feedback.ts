// Feedback on the companion.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export type Feedback = {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
};

// Name and email are copied onto the row so the inbox needs no join and a
// deleted account still leaves something readable.
export async function sendFeedback(message: string): Promise<{ error: any }> {
  const text = message.trim();
  if (!text) return { error: { message: 'Nothing to send.' } };
  try {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return { error: { message: 'Sign in first.' } };

    let fullName: string | null = null;
    try {
      const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', uid).maybeSingle();
      fullName = (prof as any)?.full_name ?? null;
    } catch {}

    const { error } = await supabase.from('companion_feedback').insert({
      user_id: uid,
      email: u?.user?.email ?? null,
      full_name: fullName,
      message: text,
    });
    return { error };
  } catch (e: any) {
    return { error: e };
  }
}

export function useFeedback() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('companion_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setItems((data as Feedback[]) ?? []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const unread = items.filter((i) => !i.read_at).length;
  return { items, unread, loading, reload: load };
}

export async function markFeedbackRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  try {
    await supabase
      .from('companion_feedback')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)
      .is('read_at', null);
  } catch {}
}

// Just the count, for the badge on the admin panel.
export function useUnreadFeedbackCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { count: n } = await supabase
          .from('companion_feedback')
          .select('id', { count: 'exact', head: true })
          .is('read_at', null);
        if (alive) setCount(n ?? 0);
      } catch {
        if (alive) setCount(null);
      }
    })();
    return () => { alive = false; };
  }, []);
  return count;
}
