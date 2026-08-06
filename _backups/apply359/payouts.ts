import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { bookingStartMs } from './bookings';
import { lineFor, type ServiceRow } from './earnings';

export type PayoutDetails = {
  account_holder: string;
  bank_name: string;
  iban: string;
  account_number: string;
  country: string;
};

export function usePayoutDetails(expertId?: string) {
  const [data, setData] = useState<PayoutDetails | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!expertId) { setLoading(false); return; }
    (async () => {
      const { data: rows } = await supabase
        .from('payout_details')
        .select('account_holder,bank_name,iban,account_number,country')
        .eq('expert_id', expertId)
        .limit(1);
      if (rows && rows[0]) setData(rows[0] as PayoutDetails);
      setLoading(false);
    })();
  }, [expertId]);
  return { data, loading };
}

export async function savePayoutDetails(expertId: string, d: PayoutDetails) {
  const { error } = await supabase
    .from('payout_details')
    .upsert({ expert_id: expertId, ...d, updated_at: new Date().toISOString() }, { onConflict: 'expert_id' });
  return { error };
}

// Admin: all experts' payout details, keyed by expert_id.
export function useAllPayoutDetails() {
  const [rows, setRows] = useState<Record<string, PayoutDetails>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('payout_details')
        .select('expert_id,account_holder,bank_name,iban,account_number,country');
      const map: Record<string, PayoutDetails> = {};
      (data ?? []).forEach((r: any) => { map[r.expert_id] = r as PayoutDetails; });
      setRows(map);
      setLoading(false);
    })();
  }, []);
  return { rows, loading };
}


// --- Paying an expert ---
// One row per payment, and every booking it covered points at it. Pending is
// the sessions that have happened with no payout_id, so nothing is counted
// twice and nothing needs reconciling by hand.

export type Payout = {
  id: string;
  expert_id: string;
  amount_minor: number;
  currency: string;
  period_start: string | null;
  period_end: string | null;
  session_count: number;
  status: string;
  paid_at: string;
  reference: string | null;
  note: string | null;
};

// Whole dirhams, since every price in the app is whole dirhams.
export function toMinor(aed: number): number { return Math.round(aed * 100); }
export function fromMinor(minor: number): number { return Math.round(minor / 100); }

// Sessions that have happened and have not been paid for. Next week is not
// owed yet.
export function payableBookings(bookings: any[]): any[] {
  const now = Date.now();
  return bookings.filter((b) => {
    if (b?.payout_id) return false;
    const at = bookingStartMs(b);
    return at != null && at < now;
  });
}

export function pendingTotal(bookings: any[], expertId: string, services: Record<string, ServiceRow>): number {
  return payableBookings(bookings)
    .map((b) => lineFor(b, expertId, services))
    .reduce((sum, l) => sum + (l.payout ?? 0), 0);
}

export function usePayouts(expertId?: string) {
  const [items, setItems] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!expertId) { setItems([]); setLoading(false); return; }
    try {
      const { data } = await supabase
        .from('payouts').select('*')
        .eq('expert_id', expertId)
        .order('paid_at', { ascending: false });
      setItems((data as Payout[]) ?? []);
    } catch { setItems([]); }
    setLoading(false);
  }, [expertId]);

  useEffect(() => { load(); }, [load]);
  return { items, loading, reload: load };
}

// Everyone's, for the admin side.
export function useAllPayouts() {
  const [items, setItems] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('payouts').select('*')
        .order('paid_at', { ascending: false }).limit(200);
      setItems((data as Payout[]) ?? []);
    } catch { setItems([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { items, loading, reload: load };
}

// The sessions a given payment covered.
export async function payoutBookings(payoutId: string): Promise<any[]> {
  try {
    const { data } = await supabase
      .from('bookings')
      .select('id,title,when_text,starts_at,booker_name,service_id')
      .eq('payout_id', payoutId)
      .order('starts_at', { ascending: true });
    return (data as any[]) ?? [];
  } catch { return []; }
}

// Records a payment and marks what it covered.
export async function recordPayout(opts: {
  expertId: string;
  bookings: any[];
  amountAed: number;
  paidBy?: string | null;
  reference?: string | null;
  note?: string | null;
}): Promise<{ payout?: Payout; error: any }> {
  const ids = opts.bookings.map((b) => b.id).filter(Boolean);
  if (!ids.length) return { error: { message: 'There is nothing outstanding to pay.' } };

  const times = opts.bookings.map((b) => bookingStartMs(b)).filter((t): t is number => t != null);
  const first = times.length ? new Date(Math.min(...times)).toISOString() : null;
  const last = times.length ? new Date(Math.max(...times)).toISOString() : null;

  const { data, error } = await supabase
    .from('payouts')
    .insert({
      expert_id: opts.expertId,
      amount_minor: toMinor(opts.amountAed),
      currency: 'AED',
      period_start: first,
      period_end: last,
      session_count: ids.length,
      status: 'paid',
      paid_by: opts.paidBy ?? null,
      reference: opts.reference?.trim() || null,
      note: opts.note?.trim() || null,
    })
    .select('*')
    .maybeSingle();

  if (error || !data) return { error: error ?? { message: 'Could not record that payout.' } };

  const payout = data as Payout;
  const stamp = await supabase.from('bookings').update({ payout_id: payout.id }).in('id', ids);

  if (stamp.error) {
    // Undone, rather than leaving a payment attached to nothing. Otherwise the
    // same sessions look unpaid and get paid again.
    await supabase.from('payouts').delete().eq('id', payout.id);
    return { error: stamp.error };
  }

  return { payout, error: null };
}
