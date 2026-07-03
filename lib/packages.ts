// Session packages. A package is paid once and grants several sessions that the
// client books one at a time. remaining = total - used.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type DBPackage = {
  id: string;
  user_id: string;
  expert_id: string | null;
  service_id: string | null;
  title: string;
  expert_name: string | null;
  total: number;
  used: number;
  created_at: string;
};

// Create a package on purchase. Returns the new package id (null when signed out).
export async function createPackage(input: {
  expertId: string; serviceId: string; title: string; expertName: string; total: number;
}): Promise<string | null> {
  try {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return null;
    const { data, error } = await supabase.from('packages').insert({
      user_id: uid,
      expert_id: input.expertId,
      service_id: input.serviceId,
      title: input.title,
      expert_name: input.expertName,
      total: input.total,
      used: 0,
    }).select('id').single();
    if (error) return null;
    return data?.id ?? null;
  } catch { return null; }
}

// Mark one session as used. Returns the new used count (or null on failure).
export async function consumePackageSession(packageId: string): Promise<number | null> {
  try {
    const { data: cur } = await supabase.from('packages').select('used, total').eq('id', packageId).maybeSingle();
    if (!cur) return null;
    const next = Math.min((cur.used ?? 0) + 1, cur.total ?? 0);
    const { error } = await supabase.from('packages').update({ used: next }).eq('id', packageId);
    if (error) return null;
    return next;
  } catch { return null; }
}

export async function getPackage(packageId: string): Promise<DBPackage | null> {
  try {
    const { data } = await supabase.from('packages').select('*').eq('id', packageId).maybeSingle();
    return (data as DBPackage) ?? null;
  } catch { return null; }
}

export function useMyPackages() {
  const [items, setItems] = useState<DBPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) { setItems([]); setLoading(false); return; }
      const { data } = await supabase.from('packages').select('*').eq('user_id', uid).order('created_at', { ascending: false });
      setItems((data as DBPackage[]) ?? []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  return { items, loading, reload: load };
}
