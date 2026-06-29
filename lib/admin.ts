// Admin helpers: list everyone, and set a person's role through a secure
// database function that only works when the caller is an admin.

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Profile } from './auth';

export function useAllProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setProfiles((data as Profile[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return { profiles, loading, reload: load };
}

export async function setUserRole(email: string, role: string): Promise<string> {
  const { data, error } = await supabase.rpc('admin_set_role', { target_email: email, new_role: role });
  if (error) return error.message;
  return (data as string) ?? 'ok';
}
