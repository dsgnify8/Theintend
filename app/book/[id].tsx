import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { EXPERTS } from '@/constants/experts';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { createBooking } from '@/lib/bookings';

const SESSION_TYPES = ['Online session', 'In person'];

export default function BookScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const expert = EXPERTS.find((e) => e.id === id);
  const [type, setType] = useState(SESSION_TYPES[0]);
  const [requested, setRequested] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>BOOK A SESSION</Text>
        <Text style={styles.h1}>{expert ? expert.name : 'The Intend'}</Text>
        {expert ? <Text style={styles.sub}>{expert.title}</Text> : null}

        {requested ? (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={32} color={COLORS.accent} />
            <Text style={styles.successTitle}>Request received</Text>
            <Text style={styles.successText}>
              The Intend team will reach out to confirm your time. You will see this under
              Upcoming sessions once it is confirmed.
            </Text>
            <Pressable style={styles.doneBtn} onPress={() => router.back()}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Text style={styles.label}>Session type</Text>
            <View style={styles.typeRow}>
              {SESSION_TYPES.map((t) => {
                const on = t === type;
                return (
                  <Pressable key={t} onPress={() => setType(t)} style={[styles.type, on && styles.typeOn]}>
                    <Text style={[styles.typeText, on && styles.typeTextOn]}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.note}>
              Live availability and secure payment are being connected. For now, send a request
              and the team will confirm your time with you.
            </Text>

            <Pressable style={styles.requestBtn} onPress={() => { createBooking({ refId: String(id), kind: 'service', title: expert ? `Consultation with ${expert.name}` : 'Consultation', when: type, expert: expert?.name, expertId: String(id) }); setRequested(true); }}>
              <Text style={styles.requestText}>Request this session</Text>
            </Pressable>
          </View>
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
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginTop: 6, marginBottom: 10 },
  h1: { fontFamily: FONT_SERIF, fontSize: 28, color: COLORS.ink },
  sub: { fontSize: 13, letterSpacing: 1, color: COLORS.muted, marginTop: 6, marginBottom: 8, textTransform: 'uppercase' },
  label: { fontFamily: FONT_SERIF, fontSize: 18, color: COLORS.ink, marginTop: 26, marginBottom: 12 },
  typeRow: { flexDirection: 'row', gap: 10 },
  type: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line },
  typeOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  typeText: { fontSize: 14, color: COLORS.ink },
  typeTextOn: { color: COLORS.bg },
  note: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginTop: 24 },
  requestBtn: { marginTop: 24, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.accent, alignItems: 'center' },
  requestText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  successCard: { backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, padding: 24, marginTop: 28, alignItems: 'center' },
  successTitle: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginTop: 12, marginBottom: 8 },
  successText: { fontSize: 14, lineHeight: 21, color: COLORS.muted, textAlign: 'center' },
  doneBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 999, borderWidth: 1, borderColor: COLORS.ink },
  doneText: { fontSize: 14, color: COLORS.ink },
});
