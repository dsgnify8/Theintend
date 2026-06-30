import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xpjtyjjbgvemwwpnxtad.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwanR5ampiZ3ZlbXd3cG54dGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MTY0MzIsImV4cCI6MjA5ODI5MjQzMn0.tw6B1MeRp6JbI-FHxp4sbNuR5_Ob9NxSTGD_UcOLCRY';

const SESSION_KEY = 'intend.session.v1';

// Why this config: a custom lock OR the library's launch-time session recovery
// both deadlock supabase-js auth on this React Native device (verified: such a
// client times out at 6s, while this one resolves getSession in ~3ms). So we
// disable both and persist the session ourselves, below.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

// Save or clear the stored session whenever auth state changes.
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.access_token && session?.refresh_token) {
    AsyncStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token })
    ).catch(() => {});
  } else {
    AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  }
});

// Restore a saved session at startup. This is a deliberate, awaited call — NOT
// the library's auto-recover — so it can't deadlock the auth client. The caller
// guards it with a timeout.
export async function restoreSession() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { access_token, refresh_token } = JSON.parse(raw);
    if (!access_token || !refresh_token) return null;
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      await AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
      return null;
    }
    return data.session ?? null;
  } catch {
    return null;
  }
}

export async function clearStoredSession() {
  await AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
}
