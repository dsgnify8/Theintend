// Auth + profile store. Any screen can call useAuth() to read the current
// session, the person's profile, and their role (user / expert / admin).

import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type Role = 'user' | 'expert' | 'admin';
export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  avatar_url: string | null;
};

let session: any = null;
let profile: Profile | null = null;
let loading = true;
let initDone = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function finishInit() {
  if (!initDone) {
    initDone = true;
    loading = false;
    emit();
  }
}

async function loadProfile(userId: string) {
  try {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) {
      profile = data as Profile;
      return;
    }
    // No profile row yet. Create one from the auth user so the account works.
    const { data: u } = await supabase.auth.getUser();
    const email = u?.user?.email ?? null;
    const full_name = (u?.user?.user_metadata as any)?.full_name ?? null;
    await supabase.from('profiles').upsert({ id: userId, email, full_name }, { onConflict: 'id' });
    const { data: again } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    profile = (again as Profile) ?? null;
  } catch {
    profile = null;
  }
}

async function init() {
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
    if (session?.user) await loadProfile(session.user.id);
  } catch {
    session = null;
  } finally {
    finishInit();
    emit();
  }
}

init();
setTimeout(finishInit, 4000);

supabase.auth.onAuthStateChange(async (_event, s) => {
  session = s;
  if (s?.user) await loadProfile(s.user.id);
  else profile = null;
  finishInit();
  emit();
});

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string, fullName: string) {
  return supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function refreshProfile() {
  if (session?.user) {
    await loadProfile(session.user.id);
    emit();
  }
}

export async function updateProfile(patch: Partial<Profile>) {
  if (!session?.user) return { error: { message: 'Not signed in' } };
  const { error } = await supabase.from('profiles').update(patch).eq('id', session.user.id);
  if (!error) await refreshProfile();
  return { error };
}

export function useAuth() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((x) => x + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return {
    session,
    user: session?.user ?? null,
    profile,
    role: (profile?.role ?? 'user') as Role,
    loading,
  };
}
