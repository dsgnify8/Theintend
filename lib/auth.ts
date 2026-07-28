// Auth + profile store. Any screen calls useAuth() for the current session,
// the person's profile, and their role (user / expert / admin).

import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { supabase, restoreSession, clearStoredSession } from './supabase';
import { clearAllUserData } from './store';
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
    // No profile row yet, so create one from the auth user and the account works.
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
  const res = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  // Update our store immediately rather than waiting on onAuthStateChange, which
  // does not reliably fire on a re-login after a local sign-out. This is what
  // moves the login screen into the app the moment sign-in succeeds. Profile
  // loads right after so navigation is not held up by it.
  if (res.data?.session) {
    session = res.data.session;
    finishInit();
    emit();
    loadProfile(res.data.session.user.id).then(emit).catch(() => {});
  }
  return res;
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
  await clearAllUserData();
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
  // Reflect the change immediately so the UI (avatar, name, and so on) updates
  // right away, instead of waiting on a server re-read that can come back stale.
  const prev = profile;
  if (profile) { profile = { ...profile, ...patch }; emit(); }
  const { error } = await supabase.from('profiles').update(patch).eq('id', session.user.id);
  if (error) { profile = prev; emit(); } // roll back only if the write failed
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

// Read the store into a plain object. Called on every emit so each update
// produces a fresh value rather than the same memoized one.
function snapshot() {
  return { session, profile, loading };
}

export function useAuth() {
  // Held as real state on purpose. Returning the module-level variables
  // directly let the compiler memoize a pre-restore value, which showed the
  // signed-out prompt to people who were already signed in.
  const [snap, setSnap] = useState(() => snapshot());
  useEffect(() => {
    const l = () => setSnap(snapshot());
    listeners.add(l);
    l();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return {
    session: snap.session,
    user: snap.session?.user ?? null,
    profile: snap.profile,
    role: (snap.profile?.role ?? 'user') as Role,
    loading: snap.loading,
  };
}
