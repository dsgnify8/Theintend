// How people are paying. Read from orders, which records the provider before
// the charge is made, so it holds even for checkouts that later failed.
// Admin only: nothing here is shown to an expert.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type ProviderStat = {
  provider: string;
  count: number;
  totalMinor: number;
};

export type OrderStats = {
  loading: boolean;
  paid: ProviderStat[];
  failed: number;
  totalPaid: number;
  tabbyShare: number | null;
};

const PAID = ['paid', 'fulfilled'];

export function useOrderStats(): OrderStats {
  const [state, setState] = useState<OrderStats>({
    loading: true, paid: [], failed: 0, totalPaid: 0, tabbyShare: null,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.from('orders').select('provider,status,amount_minor');
        const rows = (data as { provider: string; status: string; amount_minor: number }[]) ?? [];

        const byProvider: Record<string, ProviderStat> = {};
        let failed = 0;
        for (const r of rows) {
          if (!PAID.includes(r.status)) {
            if (r.status === 'failed') failed++;
            continue;
          }
          const key = r.provider || 'unknown';
          if (!byProvider[key]) byProvider[key] = { provider: key, count: 0, totalMinor: 0 };
          byProvider[key].count += 1;
          byProvider[key].totalMinor += r.amount_minor ?? 0;
        }

        const paid = Object.values(byProvider).sort((a, b) => b.count - a.count);
        const totalPaid = paid.reduce((n, p) => n + p.count, 0);
        const tabby = paid.find((p) => p.provider === 'tabby');
        const tabbyShare = totalPaid > 0 ? Math.round(((tabby?.count ?? 0) / totalPaid) * 100) : null;

        if (alive) setState({ loading: false, paid, failed, totalPaid, tabbyShare });
      } catch {
        if (alive) setState({ loading: false, paid: [], failed: 0, totalPaid: 0, tabbyShare: null });
      }
    })();
    return () => { alive = false; };
  }, []);

  return state;
}

// Orders hold the smallest unit, so fils here.
export function minorToAed(minor: number): string {
  return Math.round(minor / 100).toLocaleString('en-US') + ' AED';
}

export function providerLabel(p: string): string {
  if (p === 'stripe') return 'Card';
  if (p === 'tabby') return 'Tabby';
  return p.charAt(0).toUpperCase() + p.slice(1);
}
