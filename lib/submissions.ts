// Expert change requests that wait for admin approval before going live:
// profile edits, and brand-new classes or programs.

import { useEffect, useState } from 'react';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import { reloadExperts } from './experts';
import { createSession } from './sessions';

export type Submission = {
  id: string;
  expert_id: string;
  kind: string;
  payload: any;
  status: string;
  created_at: string;
};

function slug(s: string) {
  return (
    (s || 'offering')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'offering'
  );
}

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

export async function submitNewOffering(expertId: string, expertName: string, kind: 'class' | 'program', payload: any) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('submissions').insert({
    expert_id: expertId,
    kind,
    payload: { ...payload, expert_name: expertName },
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
  } else if (s.kind === 'class') {
    const p = s.payload || {};
    await createSession({
      id: p.id || `${slug(p.title)}-${Date.now().toString(36)}`,
      kind: 'class',
      title: p.title,
      description: p.description,
      expert_id: s.expert_id,
      expert_name: p.expert_name,
      expert_title: p.expert_title ?? '',
      color: p.color ?? '#5C4632',
      date: p.date,
      time: p.time,
      going: 0,
      duration_hours: Number(p.durationHours ?? 1),
      category: p.category ?? 'Breathwork',
      link: p.link ?? '',
      status: 'live',
      sort: 50,
    });
  } else if (s.kind === 'program') {
    const p = s.payload || {};
    await createSession({
      id: p.id || `${slug(p.title)}-${Date.now().toString(36)}`,
      kind: 'program',
      title: p.title,
      description: p.description,
      expert_id: s.expert_id,
      expert_name: p.expert_name,
      color: p.color ?? '#6F7A6B',
      weeks: Number(p.weeks ?? 0),
      sessions_count: Number(p.sessions ?? 0),
      cadence: p.cadence,
      price: p.price,
      requires_form: !!p.requiresForm,
      status: 'live',
      sort: 150,
    });
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
