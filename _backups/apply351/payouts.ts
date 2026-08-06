import { useEffect, useState } from 'react';
import { supabase } from './supabase';

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

