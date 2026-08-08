// What program sales have paid, and what is still to come.
//
// The split lives on each row, put there when it was sold, so nothing here
// recalculates anything. It only reads and groups.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { healthProgram } from '@/constants/healthPrograms';

export type ProgramSale = {
  id: string;
  program_id: string;
  expert_id: string | null;
  currency: string;
  amount_minor: number;
  apple_fee_minor: number;
  expert_share_minor: number;
  platform_share_minor: number;
  purchased_at: string;
  payable_from: string | null;
  payout_id: string | null;
  refunded_at: string | null;
};

export const APPLE_CUT = 0.15;
export const EXPERT_SHARE = 0.80;
export const HOLD_DAYS = 14;

export function money(minor: number, currency = 'USD'): string {
  const n = (minor ?? 0) / 100;
  const symbol = currency === 'USD' ? '$' : '';
  return symbol + n.toFixed(2) + (symbol ? '' : ` ${currency}`);
}

export function programTitle(programId: string): string {
  return healthProgram(programId)?.title ?? programId;
}

// Payouts run at month end, and a sale needs its fortnight first. So the month
// it lands in is the first month end on or after payable_from.
export function payoutMonthFor(sale: { payable_from: string | null; purchased_at: string }): Date {
  const from = sale.payable_from
    ? new Date(sale.payable_from)
    : new Date(new Date(sale.purchased_at).getTime() + HOLD_DAYS * 86400000);
  const d = new Date(from.getFullYear(), from.getMonth() + 1, 0, 23, 59, 59);
  return d >= from ? d : new Date(from.getFullYear(), from.getMonth() + 2, 0, 23, 59, 59);
}

export function monthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function isReady(sale: ProgramSale): boolean {
  if (sale.payout_id || sale.refunded_at) return false;
  const from = sale.payable_from ? new Date(sale.payable_from).getTime() : Infinity;
  return from <= Date.now();
}

export function isHeld(sale: ProgramSale): boolean {
  if (sale.payout_id || sale.refunded_at) return false;
  return !isReady(sale);
}

export type SalesTotals = {
  sold: number;
  gross: number;
  apple: number;
  expertPaid: number;
  expertReady: number;
  expertHeld: number;
  platform: number;
};

export function totalsFor(sales: ProgramSale[]): SalesTotals {
  const t: SalesTotals = { sold: 0, gross: 0, apple: 0, expertPaid: 0, expertReady: 0, expertHeld: 0, platform: 0 };
  for (const s of sales) {
    if (s.refunded_at) continue;
    t.sold += 1;
    t.gross += s.amount_minor ?? 0;
    t.apple += s.apple_fee_minor ?? 0;
    t.platform += s.platform_share_minor ?? 0;
    const share = s.expert_share_minor ?? 0;
    if (s.payout_id) t.expertPaid += share;
    else if (isReady(s)) t.expertReady += share;
    else t.expertHeld += share;
  }
  return t;
}

// One expert's sales. Used by their payouts screen.
export function useProgramSales(expertId?: string) {
  const [sales, setSales] = useState<ProgramSale[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!expertId) { setSales([]); setLoading(false); return; }
    try {
      const { data } = await supabase
        .from('program_purchases')
        .select('*')
        .eq('expert_id', expertId)
        .order('purchased_at', { ascending: false });
      setSales((data as ProgramSale[]) ?? []);
    } catch {
      setSales([]);
    }
    setLoading(false);
  }, [expertId]);

  useEffect(() => { load(); }, [load]);
  return { sales, loading, reload: load, totals: totalsFor(sales) };
}

// Everything, for admin.
export function useAllProgramSales() {
  const [sales, setSales] = useState<ProgramSale[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('program_purchases')
        .select('*')
        .order('purchased_at', { ascending: false })
        .limit(500);
      setSales((data as ProgramSale[]) ?? []);
    } catch {
      setSales([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { sales, loading, reload: load, totals: totalsFor(sales) };
}

// How many of each, for the admin screen.
export function byProgram(sales: ProgramSale[]): { programId: string; sold: number; gross: number }[] {
  const map: Record<string, { sold: number; gross: number }> = {};
  for (const s of sales) {
    if (s.refunded_at) continue;
    const e = map[s.program_id] ?? { sold: 0, gross: 0 };
    e.sold += 1;
    e.gross += s.amount_minor ?? 0;
    map[s.program_id] = e;
  }
  return Object.entries(map)
    .map(([programId, v]) => ({ programId, ...v }))
    .sort((a, b) => b.sold - a.sold);
}
