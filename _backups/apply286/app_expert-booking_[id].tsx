import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { formatWhenForExpert, getBookingById, setBookingLink } from '@/lib/bookings';
import { sendPushTo } from '@/lib/notifications';

export default function ExpertBookingDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<any>(undefined);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    getBookingById(String(id)).then((b) => {
      setBooking(b);
      setValue((b as any)?.link ?? '');
    });
  }, [id]);

  const inPerson = booking ? /in person/i.test(booking.title || '') : false;
  const fieldLabel = inPerson ? 'location' : 'join link';
  const placeholder = inPerson ? 'Address or place for the session' : 'https://...';

  const save = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await setBookingLink(String(id), value.trim());
    setSaving(false);
    if (!error) {
      setSaved(true); setTimeout(() => setSaved(false), 1800);
      const uid = (booking as any)?.user_id;
      if (uid && value.trim()) {
        const label = inPerson ? 'location' : 'join link';
        sendPushTo(uid, 'Session details ready', `${booking.title}: your ${label} is ready.`);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Panel</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {booking === undefined ? (
          <View style={styles.center}><ActivityIndicator color={COLORS.accent} /></View>
        ) : !booking ? (
          <Text style={styles.muted}>Booking not found.</Text>
        ) : (
          <>
            <Text style={styles.kicker}>BOOKING</Text>
            <Text style={styles.h1}>{booking.title}</Text>
            <Text style={styles.meta}>{formatWhenForExpert(booking)}</Text>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>CLIENT</Text>
              <Text style={styles.cardValue}>{booking.booker_name || 'Client'}</Text>
              {booking.booker_email ? <Text style={styles.cardSub}>{booking.booker_email}</Text> : null}
            </View>

            <Text style={styles.label}>{inPerson ? 'Set the location' : 'Set the join link'}</Text>
            <Text style={styles.hint}>{inPerson ? 'The client sees this location on their booking.' : 'Paste the video link. The client sees it on their booking.'}</Text>
            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder={placeholder}
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <Pressable style={[styles.btn, saving && styles.btnOff]} disabled={saving} onPress={save}>
              {saving ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.btnText}>{saved ? 'Saved' : `Save ${fieldLabel}`}</Text>}
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  center: { paddingVertical: 60, alignItems: 'center' },
  muted: { fontSize: 15, color: COLORS.muted, padding: 20 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginTop: 6, marginBottom: 10 },
  h1: { fontFamily: FONT_SERIF, fontSize: 26, lineHeight: 32, color: COLORS.ink },
  meta: { fontSize: 14, color: COLORS.muted, marginTop: 8 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginTop: 20 },
  cardLabel: { fontSize: 11, letterSpacing: 1.5, color: COLORS.muted, marginBottom: 6 },
  cardValue: { fontFamily: FONT_SERIF, fontSize: 17, color: COLORS.ink },
  cardSub: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  label: { fontFamily: FONT_SERIF, fontSize: 18, color: COLORS.ink, marginTop: 26, marginBottom: 6 },
  hint: { fontSize: 13, lineHeight: 19, color: COLORS.muted, marginBottom: 12 },
  input: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 14, paddingHorizontal: 14, fontSize: 15, color: COLORS.ink },
  btn: { marginTop: 18, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.taupe, alignItems: 'center' },
  btnOff: { opacity: 0.6 },
  btnText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
});
