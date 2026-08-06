// Expert change requests that wait for admin approval before going live:
// profile edits, and brand-new classes or programs.

import { useEffect, useState } from 'react';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import { reloadExperts } from './experts';
import { createSession } from './sessions';
import { reloadServices } from './services';
import { sendPushTo } from './notifications';

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

export async function submitNewOffering(expertId: string, expertName: string, kind: 'class' | 'program' | 'session', payload: any) {
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

// Friendly names on the way in, column names on the way out, so a screen never
// has to know what the table calls things.
export type ServiceEditFields = {
  name?: string;
  tagline?: string;
  price?: string;
  durationMin?: number | null;
  description?: string;
  online?: boolean;
  inPerson?: boolean;
  location?: string | null;
};

const SERVICE_COLUMN: Record<keyof ServiceEditFields, string> = {
  name: 'name',
  tagline: 'tagline',
  price: 'price',
  durationMin: 'duration_min',
  description: 'description',
  online: 'online',
  inPerson: 'in_person',
  location: 'location',
};

// Changing something that is already live and bookable. What it was is carried
// alongside what it should become, so the approval screen can show the change
// rather than a block of values with no reference point.
export async function submitServiceEdit(
  expertId: string,
  service: { id: string; name: string },
  before: ServiceEditFields,
  next: ServiceEditFields,
) {
  const patch: Record<string, any> = {};
  const shown: Record<string, { from: any; to: any }> = {};
  (Object.keys(next) as (keyof ServiceEditFields)[]).forEach((k) => {
    if (next[k] === undefined) return;
    if (next[k] === before[k]) return;
    patch[SERVICE_COLUMN[k]] = next[k];
    shown[k as string] = { from: before[k], to: next[k] };
  });

  if (!Object.keys(patch).length) return { error: { message: 'Nothing has changed.' } };

  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('submissions').insert({
    expert_id: expertId,
    kind: 'service_edit',
    payload: { service_id: service.id, title: service.name, patch, changes: shown },
    status: 'pending',
    created_by: u?.user?.id,
  });
  return { error };
}

// What this expert has sent, and where each one got to.
export function useMySubmissions(expertId?: string) {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!expertId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .eq('expert_id', expertId)
      .order('created_at', { ascending: false })
      .limit(50);
    setItems((data as Submission[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [expertId]);
  return { items, loading, reload: load };
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
  } else if (s.kind === 'session') {
    // Writes the services row the booking screen actually reads. Without this
    // an approved session was approved and nowhere.
    const p = s.payload || {};
    const id = p.id || `${s.expert_id}-${slug(p.title)}-${Date.now().toString(36)}`;
    await supabase.from('services').upsert({
      id,
      expert_id: s.expert_id,
      name: p.title,
      tagline: p.tagline ?? '',
      duration_min: p.durationMin ? Number(p.durationMin) : null,
      price: p.price ?? '',
      online: p.online !== false,
      in_person: !!p.inPerson,
      kind: p.kind === 'package' ? 'package' : 'single',
      sessions_total: p.sessionsTotal ? Number(p.sessionsTotal) : null,
      description: p.description ?? '',
      location: p.location ?? null,
      sort: 100,
    }, { onConflict: 'id' });
    await reloadServices();
  } else if (s.kind === 'service_edit') {
    const p = s.payload || {};
    if (p.service_id && p.patch && Object.keys(p.patch).length) {
      await supabase.from('services').update(p.patch).eq('id', p.service_id);
      await reloadServices();
    }
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
  if (!error) {
    await reloadExperts();
    const uid = (s as any).created_by;
    if (uid) {
      const label = s.kind === 'program' ? 'program' : s.kind === 'class' ? 'class' : s.kind === 'session' ? 'session' : s.kind === 'service_edit' ? 'change' : 'profile update';
      const title = s.payload?.title ?? 'Your submission';
      sendPushTo(uid, `Your ${label} is live`, s.kind === 'profile' ? 'Your profile update is now live.' : `${title} is now live on The Intend.`);
    }
  }
  return { error };
}

export async function rejectSubmission(id: string, reason?: string) {
  const { data: row } = await supabase.from('submissions').select('*').eq('id', id).maybeSingle();
  const { error } = await supabase
    .from('submissions')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString(), review_note: reason ?? null })
    .eq('id', id);
  // Silence reads as being ignored. Better to say so, even briefly.
  if (!error && row) {
    const uid = (row as any).created_by;
    if (uid) {
      const what = (row as any)?.payload?.title ?? 'Your submission';
      sendPushTo(uid, 'We could not publish that yet', reason?.trim() || `${what} needs a change before it can go live. We will be in touch.`);
    }
  }
  return { error };
}
