// Quote of the day for the homepage. Affirmations are generated per person, so
// this reads their own where it can and falls back to a bundled set when they
// are signed out or have not generated any yet. The same line shows all day.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export const FALLBACK_QUOTES: string[] = [
  'I can move at my own pace.',
  'What I feel is information, not instruction.',
  'I am allowed to change my mind.',
  'I can begin again at any point in the day.',
  'Rest is part of the work.',
  'I do not have to earn my own care.',
];

function pickForToday<T>(list: T[]): T {
  const day = Math.floor(Date.now() / 86400000);
  return list[day % list.length];
}

export function useQuoteOfDay(): { text: string; mine: boolean } {
  const [state, setState] = useState<{ text: string; mine: boolean }>(() => ({
    text: pickForToday(FALLBACK_QUOTES),
    mine: false,
  }));

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        if (!uid) return;
        // Prefer the ones they liked, since those are the lines that landed.
        const liked = await supabase
          .from('affirmations')
          .select('text')
          .eq('user_id', uid)
          .eq('liked', true)
          .order('created_at', { ascending: true });
        let rows = (liked.data as { text: string }[]) ?? [];
        if (!rows.length) {
          const all = await supabase
            .from('affirmations')
            .select('text')
            .eq('user_id', uid)
            .order('created_at', { ascending: true })
            .limit(60);
          rows = (all.data as { text: string }[]) ?? [];
        }
        const texts = rows.map((r) => r.text).filter(Boolean);
        if (alive && texts.length) setState({ text: pickForToday(texts), mine: true });
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  return state;
}
