// Payment confirmation, and a durable receipt users can revisit from You.
// Fetches the order by id and reflects its current status (paid, fulfilled,
// failed). Also fetches the linked booking when the order landed on one, so
// the user can open the session from here.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT_ITALIC, FONT_SERIF } from '@/constants/brand';
import { getOrder, type Order } from '@/lib/orders';
import { getBookingById, formatWhenLocal } from '@/lib/bookings';

function shortId(id: string) {
  // Last eight characters, uppercase, without dashes. Enough to read out on
  // the phone with support and short enough to sit on one line.
  return id.replace(/-/g, '').slice(-8).toUpperCase();
}

function formatAmount(minor: number, currency: string) {
  const major = minor / 100;
  const s = major.toFixed(major % 1 === 0 ? 0 : 2);
  return currency.toUpperCase() + ' ' + s;
}

function providerLabel(p: string) {
  if (p === 'stripe') return 'Card';
  if (p === 'tabby') return 'Tabby (pay in 4)';
  return p;
}

export default function OrderConfirmation() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [bookingWhen, setBookingWhen] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getOrder(String(id)).then(setOrder);
  }, [id]);

  // If the booking landed, pull its formatted "when" so the receipt shows the
  // same string the client sees under Upcoming sessions.
  useEffect(() => {
    if (!order?.booking_id) return;
    getBookingById(order.booking_id).then((b) => {
      if (b) setBookingWhen(formatWhenLocal(b as any));
    });
  }, [order?.booking_id]);

  const goHome = () => router.replace('/');
  const goSessions = () => router.replace('/(tabs)/you');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.back} onPress={goHome} hitSlop={12}>
        <Ionicons name="close" size={22} color={COLORS.ink} />
      </Pressable>

      {order === undefined ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.accent} /></View>
      ) : !order ? (
        <View style={styles.center}>
          <Text style={styles.muted}>We could not find this order.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={[styles.icon, order.status === 'failed' && styles.iconFail]}>
              <Ionicons
                name={order.status === 'failed' ? 'alert' : 'checkmark'}
                size={28}
                color={COLORS.bg}
              />
            </View>
            <Text style={styles.kicker}>
              {order.status === 'failed'
                ? 'PAYMENT DID NOT COMPLETE'
                : order.status === 'started'
                ? 'PAYMENT PROCESSING'
                : 'PAYMENT CONFIRMED'}
            </Text>
            <Text style={styles.h1}>
              {order.status === 'failed' ? 'Not charged' : 'Thank you'}
            </Text>
            {order.status !== 'failed' ? (
              <Text style={styles.sub}>
                You'll find this under <Text style={styles.subItalic}>Upcoming sessions</Text>.
              </Text>
            ) : (
              <Text style={styles.sub}>
                Nothing was charged. If your card was, tell us and we'll sort it out.
              </Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>ORDER</Text>
            <Text style={styles.orderLabel}>{order.label}</Text>
            <Text style={styles.amount}>{formatAmount(order.amount_minor, order.currency)}</Text>

            <View style={styles.rule} />

            {bookingWhen ? (
              <Row label="When" value={bookingWhen} />
            ) : order.intended_start ? (
              <Row label="When" value={new Date(order.intended_start).toString().slice(0, 21)} />
            ) : null}
            <Row label="Paid via" value={providerLabel(order.provider)} />
            <Row label="Order" value={'#' + shortId(order.id)} />
            {order.status === 'fulfilled' || order.status === 'paid' ? (
              <Row label="Status" value={order.status === 'fulfilled' ? 'Confirmed' : 'Paid'} />
            ) : null}
            {order.error ? <Row label="Reason" value={order.error} /> : null}
          </View>

          {order.status === 'failed' ? (
            <Pressable style={styles.primary} onPress={() => router.back()}>
              <Text style={styles.primaryText}>Try again</Text>
            </Pressable>
          ) : order.booking_id ? (
            <Pressable style={styles.primary} onPress={goSessions}>
              <Text style={styles.primaryText}>Open my sessions</Text>
            </Pressable>
          ) : null}

          <Pressable style={styles.secondary} onPress={goHome} hitSlop={8}>
            <Text style={styles.secondaryText}>Done</Text>
          </Pressable>

          <Text style={styles.note}>
            Keep this order number for support. You can find it again under You {'\u203A'} My orders.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  back: { alignSelf: 'flex-end', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  muted: { fontSize: 15, color: COLORS.muted, textAlign: 'center' },
  content: { paddingHorizontal: 22, paddingBottom: 60 },

  hero: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
  icon: { width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  iconFail: { backgroundColor: '#9B5A4A' },
  kicker: { fontSize: 10.5, letterSpacing: 3, color: COLORS.muted, marginBottom: 14 },
  h1: { fontFamily: FONT_SERIF, fontSize: 40, color: COLORS.ink, textAlign: 'center' },
  sub: { fontSize: 14, lineHeight: 22, color: COLORS.muted, textAlign: 'center', marginTop: 14, paddingHorizontal: 20 },
  subItalic: { fontFamily: FONT_ITALIC, color: COLORS.accent },

  card: { backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, padding: 22, marginBottom: 22 },
  label: { fontSize: 11, letterSpacing: 2, color: COLORS.muted, marginBottom: 10 },
  orderLabel: { fontFamily: FONT_SERIF, fontSize: 20, lineHeight: 26, color: COLORS.ink },
  amount: { fontFamily: FONT_SERIF, fontSize: 26, color: COLORS.accent, marginTop: 8 },
  rule: { height: 1, backgroundColor: COLORS.line, marginVertical: 18 },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 8, gap: 12 },
  rowLabel: { fontSize: 13, color: COLORS.muted, letterSpacing: 0.3 },
  rowValue: { flex: 1, textAlign: 'right', fontSize: 14, color: COLORS.ink },

  primary: { backgroundColor: '#1A1A1A', paddingVertical: 15, borderRadius: 999, alignItems: 'center' },
  primaryText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.3 },
  secondary: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  secondaryText: { fontSize: 14, color: COLORS.muted },
  note: { fontSize: 12, lineHeight: 18, color: COLORS.muted, textAlign: 'center', marginTop: 12, paddingHorizontal: 12 },
});
