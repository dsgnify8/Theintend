// My orders. Every order the signed-in user has made, newest first. Each row
// opens the confirmation for that order, which acts as its permanent receipt.

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_ITALIC, FONT_SERIF } from '@/constants/brand';
import { useMyOrders, type Order } from '@/lib/orders';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shortDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear();
}

function formatAmount(minor: number, currency: string) {
  const major = minor / 100;
  const s = major.toFixed(major % 1 === 0 ? 0 : 2);
  return currency.toUpperCase() + ' ' + s;
}

function statusLabel(s: string): string {
  if (s === 'fulfilled') return 'Confirmed';
  if (s === 'paid') return 'Paid';
  if (s === 'failed') return 'Failed';
  if (s === 'started') return 'Processing';
  return s;
}

function statusColor(s: string): string {
  if (s === 'fulfilled' || s === 'paid') return COLORS.accent;
  if (s === 'failed') return '#9B5A4A';
  return COLORS.muted;
}

export default function OrdersScreen() {
  const router = useRouter();
  const { orders, loading } = useMyOrders();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.back} onPress={() => router.back()} hitSlop={12}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>YOU</Text>
        <Text style={styles.h1}>My <Text style={styles.h1Italic}>orders</Text></Text>
        <Text style={styles.sub}>Every payment you have made through The Intend.</Text>

        {loading ? (
          <View style={styles.loader}><ActivityIndicator color={COLORS.accent} /></View>
        ) : orders.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nothing here yet.</Text>
            <Text style={styles.emptySub}>When you book a session, the receipt will land here.</Text>
          </View>
        ) : (
          orders.map((o) => <Row key={o.id} order={o} onPress={() => router.push(`/order/${o.id}`)} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ order, onPress }: { order: Order; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label} numberOfLines={2}>{order.label}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.status, { color: statusColor(order.status) }]}>
            {statusLabel(order.status)}
          </Text>
          <Text style={styles.dot}>{'\u00B7'}</Text>
          <Text style={styles.date}>{shortDate(order.created_at)}</Text>
        </View>
      </View>
      <View style={styles.rightCol}>
        <Text style={styles.amount}>{formatAmount(order.amount_minor, order.currency)}</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  back: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 22, paddingBottom: 60 },
  kicker: { fontSize: 11, letterSpacing: 3, color: COLORS.muted, marginTop: 8, marginBottom: 12 },
  h1: { fontFamily: FONT_SERIF, fontSize: 36, color: COLORS.ink },
  h1Italic: { fontFamily: FONT_ITALIC, fontSize: 38, color: COLORS.accent },
  sub: { fontSize: 14, lineHeight: 22, color: COLORS.muted, marginTop: 10, marginBottom: 26 },
  loader: { paddingVertical: 60, alignItems: 'center' },
  empty: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, color: COLORS.ink, marginBottom: 8 },
  emptySub: { fontSize: 13, color: COLORS.muted, textAlign: 'center', paddingHorizontal: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line,
    padding: 18, marginBottom: 12,
  },
  label: { fontFamily: FONT_SERIF, fontSize: 16, lineHeight: 22, color: COLORS.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  status: { fontSize: 12, letterSpacing: 0.3 },
  dot: { fontSize: 12, color: COLORS.muted },
  date: { fontSize: 12, color: COLORS.muted },
  rightCol: { alignItems: 'flex-end', gap: 6 },
  amount: { fontFamily: FONT_SERIF, fontSize: 15, color: COLORS.accent },
});
