// Who owns which health program.
//
// Kept against the account rather than the device, so a program follows
// someone to a new phone and the team can give one to an expert or a friend.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { HEALTH_PROGRAM_PRICE_USD } from '@/constants/healthPrograms';

export type ProgramPurchase = {
  program_id: string;
  purchased_at: string;
  source: string;
};

export function useOwnedPrograms() {
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) { setIds([]); setLoading(false); return; }
      const { data } = await supabase
        .from('program_purchases')
        .select('program_id')
        .eq('user_id', uid);
      setIds(((data as any[]) ?? []).map((r) => r.program_id));
    } catch {
      setIds([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { ids, loading, reload: load };
}

// Written after Apple confirms, never before. The unique pair on the table
// means a repeat cannot create a second row.
export async function recordProgramPurchase(opts: {
  programId: string;
  transactionId?: string | null;
  source?: 'apple' | 'granted' | 'restored';
}): Promise<{ error: any }> {
  try {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return { error: { message: 'Sign in first.' } };
    const { error } = await supabase.from('program_purchases').upsert(
      {
        user_id: uid,
        program_id: opts.programId,
        amount_minor: Math.round(HEALTH_PROGRAM_PRICE_USD * 100),
        currency: 'USD',
        source: opts.source ?? 'apple',
        transaction_id: opts.transactionId ?? null,
      },
      { onConflict: 'user_id,program_id' },
    );
    return { error };
  } catch (e: any) {
    return { error: e };
  }
}

export type BuyResult = { ok: boolean; reason?: string };

// THE ONE PLACE THAT CHANGES WHEN IN APP PURCHASE IS WIRED.
//
// It will ask Apple, wait for the result, and only then call
// recordProgramPurchase. Until that exists it says so, because a button that
// silently does nothing is worse than one that explains itself.
export async function buyProgram(_programId: string): Promise<BuyResult> {
  return {
    ok: false,
    reason: 'Buying is not switched on in this build yet. It arrives with the next release.',
  };
}
