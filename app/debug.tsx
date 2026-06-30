import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, DevSettings } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = 'https://xpjtyjjbgvemwwpnxtad.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwanR5ampiZ3ZlbXd3cG54dGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MTY0MzIsImV4cCI6MjA5ODI5MjQzMn0.tw6B1MeRp6JbI-FHxp4sbNuR5_Ob9NxSTGD_UcOLCRY';
const CLIENT_ID = 'e28c1da0-36e8-4a6a-aa16-e81da547fed8';
const WIX = 'https://www.wixapis.com';

type Line = { label: string; value: string; ok: boolean };

export default function DebugScreen() {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);
  const [cleared, setCleared] = useState(false);

  const add = (label: string, value: string, ok: boolean) =>
    setLines((prev) => [...prev, { label, value, ok }]);

  const withTimeout = <T,>(p: Promise<T>, ms: number) =>
    Promise.race([
      p,
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`timed out after ${ms}ms`)), ms)),
    ]);

  const run = async () => {
    setLines([]);
    setRunning(true);

    // 1. Raw REST ping — bypasses the Supabase client entirely.
    try {
      const r: any = await withTimeout(
        fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`, {
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        }),
        8000
      );
      add('Supabase RAW REST', r.ok ? 'reachable (HTTP ' + r.status + ')' : 'HTTP ' + r.status, r.ok);
    } catch (e: any) {
      add('Supabase RAW REST', 'FAILED: ' + (e?.message ?? String(e)), false);
    }

    // 2. FRESH lockless client built right here — isolates config vs environment.
    try {
      const fresh = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const t0 = Date.now();
      await withTimeout(fresh.auth.getSession(), 6000);
      const ms = Date.now() - t0;
      const q: any = await withTimeout(fresh.from('profiles').select('id').limit(1), 6000);
      add('Fresh lockless client', `getSession ${ms}ms · query ` + (q.error ? 'err: ' + q.error.message : 'ok'), !q.error);
    } catch (e: any) {
      add('Fresh lockless client', 'FAILED: ' + (e?.message ?? String(e)), false);
    }

    // 3. The app's imported client — auth session
    try {
      const data: any = await withTimeout(supabase.auth.getSession(), 6000);
      add('App client auth', data?.data?.session ? 'signed in' : 'no session', true);
    } catch (e: any) {
      add('App client auth', 'FAILED: ' + (e?.message ?? String(e)), false);
    }

    // 4. The app's imported client — query
    try {
      const r: any = await withTimeout(supabase.from('profiles').select('id').limit(1), 6000);
      add('App client query', r.error ? 'error: ' + r.error.message : 'ok', !r.error);
    } catch (e: any) {
      add('App client query', 'FAILED: ' + (e?.message ?? String(e)), false);
    }

    // 5. Wix token
    try {
      const r: any = await withTimeout(
        fetch(`${WIX}/oauth2/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: CLIENT_ID, grantType: 'anonymous' }),
        }),
        8000
      );
      const d = await r.json();
      add('Wix token', d.access_token ? 'got token' : 'no token', !!d.access_token);
    } catch (e: any) {
      add('Wix token', 'FAILED: ' + (e?.message ?? String(e)), false);
    }

    setRunning(false);
  };

  const clearLogin = async () => {
    try {
      await AsyncStorage.clear();
      setCleared(true);
      add('Saved login', 'cleared — reloading…', true);
      setTimeout(() => {
        try { DevSettings.reload(); } catch { /* manual reload */ }
      }, 700);
    } catch (e: any) {
      add('Saved login', 'FAILED to clear: ' + (e?.message ?? String(e)), false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.back} onPress={() => router.back()} hitSlop={10}>
        <Text style={styles.backText}>Close</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>Debug</Text>
        <Text style={styles.sub}>Runs the live checks and prints the real result of each.</Text>

        <Pressable style={[styles.btn, running && styles.btnOff]} onPress={run} disabled={running}>
          <Text style={styles.btnText}>{running ? 'Running…' : 'Run checks'}</Text>
        </Pressable>

        <Pressable style={[styles.btn, styles.btnClear, cleared && styles.btnOff]} onPress={clearLogin} disabled={cleared}>
          <Text style={styles.btnClearText}>{cleared ? 'Cleared' : 'Clear saved login & restart'}</Text>
        </Pressable>

        {lines.map((l, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.rowLabel}>{l.label}</Text>
            <Text style={[styles.rowValue, { color: l.ok ? '#3C6E47' : '#A6453B' }]}>{l.value}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  back: { paddingHorizontal: 18, paddingVertical: 12 },
  backText: { fontSize: 16, color: COLORS.ink },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  h1: { fontFamily: FONT_SERIF, fontSize: 30, color: COLORS.ink },
  sub: { fontSize: 14, color: COLORS.muted, marginTop: 8, marginBottom: 20 },
  btn: { backgroundColor: COLORS.accent, paddingVertical: 15, borderRadius: 999, alignItems: 'center', marginBottom: 12 },
  btnOff: { opacity: 0.5 },
  btnText: { color: COLORS.bg, fontSize: 15 },
  btnClear: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, marginBottom: 22 },
  btnClearText: { color: COLORS.ink, fontSize: 15 },
  row: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  rowLabel: { fontSize: 13, letterSpacing: 0.5, color: COLORS.muted, marginBottom: 6 },
  rowValue: { fontSize: 14, lineHeight: 20 },
});
