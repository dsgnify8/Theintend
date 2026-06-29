// Expert change requests that wait for admin approval before going live.

import { useEffect, useState } from 'react';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import { reloadExperts } from './experts';

export type Submission = {
  id: string;
  expert_id: string;
  kind: string;
  payload: any;
  status: string;
  created_at: string;
};

export async function submitProfileChange(expertId: string, payload: { bio?: string; photo?: string }) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('submissions').insert({
    expert_id: expertId,
    kind: 'profile',
    payload,
    status: 'pending',
    created_by: u?.user?.id,
  });
  return { error };
}

export async function uploadSubmissionImage(base64: string): Promise<string> {
  const path = `submissions/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

export function usePendingSubmissions() {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setItems((data as Submission[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return { items, loading, reload: load };
}

export async function approveSubmission(s: Submission) {
  if (s.kind === 'profile') {
    const patch: any = {};
    if (s.payload?.bio !== undefined) patch.bio = s.payload.bio;
    if (s.payload?.photo !== undefined) patch.photo = s.payload.photo;
    if (Object.keys(patch).length) await supabase.from('experts').update(patch).eq('id', s.expert_id);
  }
  const { error } = await supabase
    .from('submissions')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', s.id);
  if (!error) await reloadExperts();
  return { error };
}

export async function rejectSubmission(id: string) {
  const { error } = await supabase
    .from('submissions')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', id);
  return { error };
}
