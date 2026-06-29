import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { supabase } from '@/lib/supabase';

const CLIENT_ID = 'e28c1da0-36e8-4a6a-aa16-e81da547fed8';
const WIX = 'https://www.wixapis.com';

type Line = { label: string; value: string; ok: boolean };

export default function DebugScreen() {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);

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

    // 1. Supabase auth session
    try {
      const { data, error } = (await withTimeout(supabase.auth.getSession(), 6000)) as any;
      if (error) add('Auth session', 'error: ' + error.message, false);
      else if (data?.session) add('Auth session', 'signed in as ' + (data.session.user?.email ?? '?'), true);
      else add('Auth session', 'no active session (signed out)', true);
    } catch (e: any) {
      add('Auth session', 'FAILED: ' + (e?.message ?? String(e)), false);
    }

    // 2. Supabase query (profiles)
    try {
      const { error } = (await withTimeout(supabase.from('profiles').select('id').limit(1), 6000)) as any;
      if (error) add('Supabase query', 'error: ' + error.message, false);
      else add('Supabase query', 'profiles reachable', true);
    } catch (e: any) {
      add('Supabase query', 'FAILED: ' + (e?.message ?? String(e)), false);
    }

    // 3. Wix token
    let token = '';
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
      if (!r.ok) add('Wix token', 'HTTP ' + r.status + ': ' + JSON.stringify(d).slice(0, 120), false);
      else {
        token = d.access_token ?? '';
        add('Wix token', token ? 'got token' : 'no token in response', !!token);
      }
    } catch (e: any) {
      add('Wix token', 'FAILED: ' + (e?.message ?? String(e)), false);
    }

    // 4. Wix posts
    if (token) {
      try {
        const r: any = await withTimeout(
          fetch(`${WIX}/blog/v3/posts?paging.limit=5&fieldsets=RICH_CONTENT`, { headers: { Authorization: token } }),
          8000
        );
        const d = await r.json();
        if (!r.ok) add('Wix posts', 'HTTP ' + r.status + ': ' + JSON.stringify(d).slice(0, 120), false);
        else add('Wix posts', (d.posts?.length ?? 0) + ' posts returned', (d.posts?.length ?? 0) > 0);
      } catch (e: any) {
        add('Wix posts', 'FAILED: ' + (e?.message ?? String(e)), false);
      }
    } else {
      add('Wix posts', 'skipped (no token)', false);
    }

    setRunning(false);
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
  btn: { backgroundColor: COLORS.accent, paddingVertical: 15, borderRadius: 999, alignItems: 'center', marginBottom: 22 },
  btnOff: { opacity: 0.5 },
  btnText: { color: COLORS.bg, fontSize: 15 },
  row: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  rowLabel: { fontSize: 13, letterSpacing: 0.5, color: COLORS.muted, marginBottom: 6 },
  rowValue: { fontSize: 14, lineHeight: 20 },
});
