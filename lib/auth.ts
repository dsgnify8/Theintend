// Auth + profile store. Any screen calls useAuth() for the current session,
// the person's profile, and their role (user / expert / admin).

import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { supabase, restoreSession, clearStoredSession } from './supabase';
import * as Linking from 'expo-linking';

export type Role = 'user' | 'expert' | 'admin';
export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  avatar_url: string | null;
  phone: string | null;
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

const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(undefined as any), ms))]);

async function loadProfile(userId: string) {
  try {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) {
      profile = data as Profile;
      return;
    }
    // No profile row yet — create one from the auth user so the account works.
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
    // Restore a previously saved login, guarded so a slow restore can't hang us.
    await withTimeout(restoreSession(), 5000);
    const { data } = await supabase.auth.getSession();
    session = data.session;
    if (session?.user) await withTimeout(loadProfile(session.user.id), 5000);
  } catch {
    session = null;
  } finally {
    finishInit();
    emit();
  }
}

init();
setTimeout(finishInit, 6000); // hard safety: never spin forever

supabase.auth.onAuthStateChange(async (_event, s) => {
  session = s;
  if (s?.user) await withTimeout(loadProfile(s.user.id), 5000);
  else profile = null;
  finishInit();
  emit();
});

// Keep the access token fresh so signed-in requests do not start failing after
// the token's ~1 hour lifetime. We refresh explicitly (on foreground and on a
// timer) instead of the library's auto-refresh, which deadlocks on this device.
async function refreshIfNeeded() {
  try {
    if (!session?.refresh_token) return;
    const expMs = session?.expires_at ? session.expires_at * 1000 : 0;
    if (expMs && Date.now() < expMs - 5 * 60 * 1000) return; // still fresh
    const res: any = await withTimeout(supabase.auth.refreshSession(), 8000);
    if (res && !res.error && res.data?.session) { session = res.data.session; emit(); }
  } catch {}
}
AppState.addEventListener('change', (st) => { if (st === 'active') refreshIfNeeded(); });
setInterval(() => { refreshIfNeeded(); }, 4 * 60 * 1000);

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email: email.trim(), password });
}

export async function signUp(email: string, password: string, fullName: string) {
  return supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: fullName } },
  });
}

export async function signOut() {
  // Clear locally and immediately so the UI updates even if the network is slow.
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* ignore */
  }
  await clearStoredSession();
  session = null;
  profile = null;
  emit();
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

export async function sendPasswordReset(email: string) {
  const redirectTo = Linking.createURL('reset-password');
  return supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
}
export async function updatePassword(newPassword: string) {
  return supabase.auth.updateUser({ password: newPassword });
}

export async function deleteAccount() {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) return { error };
  await signOut();
  return { error: null };
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
