import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import {
  adminCancelBooking, bookingStartMs, formatWhenLocal, resolutionFor, resolutionLabel, useAllBookings,
} from '@/lib/bookings';

const WASH = ['rgba(107,97,87,0.13)', 'rgba(107,97,87,0.04)', 'rgba(107,97,87,0)'];
type Tab = 'up' | 'past' | 'cancelled';

export default function AdminBookings() {
  const router = useRouter();
  const { role } = useAuth();
  const { items, loading, reload } = useAllBookings();
  const [tab, setTab] = useState<Tab>('up');
  const [q, setQ] = useState('');
  const [working, setWorking] = useState<string | null>(null);

  const groups = useMemo(() => {
    const now = Date.now();
    const up: any[] = [];
    const past: any[] = [];
    const cancelled: any[] = [];
    for (const b of items as any[]) {
      if (b.status === 'cancelled') { cancelled.push(b); continue; }
      const at = bookingStartMs(b);
      if (at == null || at >= now - 3600000) up.push(b);
      else past.push(b);
    }
    up.sort((a, c) => (bookingStartMs(a) ?? Infinity) - (bookingStartMs(c) ?? Infinity));
    past.sort((a, c) => (bookingStartMs(c) ?? 0) - (bookingStartMs(a) ?? 0));
    return { up, past, cancelled };
  }, [items]);

  const shown = useMemo(() => {
    const list = tab === 'up' ? groups.up : tab === 'past' ? groups.past : groups.cancelled;
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((b: any) =>
      [b.title, b.booker_name, b.booker_email, b.expert_name]
        .filter(Boolean)
        .some((v: string) => v.toLowerCase().includes(term)),
    );
  }, [groups, tab, q]);

  if (role !== 'admin') {
    return <Wrap router={router}><View style={styles.center}><Text style={styles.muted}>Admins only.</Text></View></Wrap>;
  }

  const cancel = (b: any) => {
    const res = resolutionFor(b);
    const owed = res === 'refund'
      ? 'The expert has not been paid for this yet, so a refund is clean.'
      : 'The expert has already been paid for this, so it comes back as store credit.';
    const pkg = b.package_id ? ' The package session goes back so it can be booked again.' : '';

    const run = async (resolution: 'refund' | 'credit' | 'none', reason?: string) => {
      setWorking(b.id);
      const { error, creditReturned } = await adminCancelBooking(b.id, { reason: reason ?? '', resolution });
      setWorking(null);
      if (error) {
        Alert.alert('That did not save', error.message ?? 'Nothing was cancelled. Try again.');
        return;
      }
      reload();
      if (b.package_id && !creditReturned) {
        Alert.alert('Cancelled, but check the package', 'The session was cancelled but the package credit did not go back. Put it back by hand.');
      }
    };

    const ask = (resolution: 'refund' | 'credit' | 'none') => {
      Alert.prompt?.(
        'Why is it cancelled',
        'Kept on the booking so there is a record.',
        [
          { text: 'Back', style: 'cancel' },
          { text: 'Cancel it', style: 'destructive', onPress: (reason?: string) => run(resolution, reason) },
        ],
        'plain-text',
      ) ?? run(resolution);
    };

    Alert.alert(
      `Cancel ${b.title}`,
      `${owed}${pkg}\n\nThis cannot be undone, and it disappears from the client's app.`,
      [
        { text: 'Keep it', style: 'cancel' },
        { text: resolutionLabel(res), onPress: () => ask(res) },
        { text: 'Nothing owed', onPress: () => ask('none') },
      ],
    );
  };

  return (
    <Wrap router={router}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Bookings</Text>
        <Text style={styles.sub}>Everything booked, and the only place a booking can be cancelled.</Text>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={17} color={COLORS.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Client, expert or session"
            placeholderTextColor={COLORS.muted}
            style={styles.searchInput}
            autoCapitalize="none"
          />
          {q ? <Pressable onPress={() => setQ('')} hitSlop={8}><Ionicons name="close-circle" size={17} color={COLORS.muted} /></Pressable> : null}
        </View>

        <View style={styles.tabRow}>
          {(['up', 'past', 'cancelled'] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]}>
              <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
                {t === 'up' ? `Upcoming (${groups.up.length})` : t === 'past' ? `Past (${groups.past.length})` : `Cancelled (${groups.cancelled.length})`}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.loaderBox}><ActivityIndicator color={COLORS.accent} /></View>
        ) : shown.length === 0 ? (
          <Text style={styles.emptyText}>{q ? 'Nothing matches that.' : 'Nothing here.'}</Text>
        ) : (
          shown.map((b: any) => (
            <View key={b.id} style={styles.card}>
              <Text style={styles.title} numberOfLines={2}>{b.title}</Text>
              <Text style={styles.meta}>{formatWhenLocal(b)}</Text>
              <Text style={styles.meta}>
                {b.booker_name || 'Client'}
                {b.booker_email ? `  ${b.booker_email}` : ''}
              </Text>
              <Text style={styles.meta}>with {b.expert_name || b.expert_id}</Text>

              <View style={styles.tagRow}>
                {b.package_id ? <Text style={styles.tag}>Package</Text> : null}
                {b.payout_id ? <Text style={styles.tagPaid}>Expert paid</Text> : null}
                {b.reschedule_count ? <Text style={styles.tag}>Moved {b.reschedule_count}x</Text> : null}
                {b.status === 'awaiting_reschedule' ? <Text style={styles.tagWarn}>Waiting on a new time</Text> : null}
              </View>

              {b.status === 'cancelled' ? (
                <View style={styles.cancelledBox}>
                  <Text style={styles.cancelledLine}>
                    Cancelled{b.resolution ? `, ${resolutionLabel(b.resolution).toLowerCase()}` : ''}
                  </Text>
                  {b.cancel_reason ? <Text style={styles.meta}>{b.cancel_reason}</Text> : null}
                </View>
              ) : (
                <Pressable
                  style={[styles.cancelBtn, working === b.id && { opacity: 0.5 }]}
                  disabled={working === b.id}
                  onPress={() => cancel(b)}
                >
                  {working === b.id
                    ? <ActivityIndicator color="#8F4A3B" />
                    : <Text style={styles.cancelText}>Cancel this booking</Text>}
                </Pressable>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </Wrap>
  );
}

function Wrap({ children, router }: { children: any; router: any }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={WASH} style={styles.wash} pointerEvents="none" />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Admin</Text>
      </Pressable>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 15, color: COLORS.muted },
  content: { paddingHorizontal: 20, paddingBottom: 56 },
  h1: { fontFamily: FONT_SERIF, fontSize: 30, color: COLORS.ink, marginBottom: 6 },
  sub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginBottom: 14 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', paddingHorizontal: 16, paddingVertical: 11, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.ink, padding: 0 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line },
  tabOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  tabText: { fontSize: 12, color: COLORS.ink },
  tabTextOn: { color: COLORS.bg },
  loaderBox: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: COLORS.muted, paddingVertical: 24, textAlign: 'center' },
  card: { backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', padding: 16, marginBottom: 10 },
  title: { fontFamily: FONT_SERIF, fontSize: 17, lineHeight: 23, color: COLORS.ink },
  meta: { fontSize: 12, lineHeight: 18, color: COLORS.muted, marginTop: 3 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { fontSize: 11, color: COLORS.ink, backgroundColor: COLORS.accentSoft, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, overflow: 'hidden' },
  tagPaid: { fontSize: 11, color: COLORS.bg, backgroundColor: COLORS.taupeBlue, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, overflow: 'hidden' },
  tagWarn: { fontSize: 11, color: COLORS.bg, backgroundColor: COLORS.accent, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, overflow: 'hidden' },
  cancelBtn: { marginTop: 12, paddingVertical: 11, borderRadius: 999, borderWidth: 1, borderColor: '#8F4A3B', alignItems: 'center' },
  cancelText: { color: '#8F4A3B', fontSize: 14 },
  cancelledBox: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 10 },
  cancelledLine: { fontSize: 13, color: '#8F4A3B' },
});
