import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { getExpertForEmail, updateExpert } from '@/lib/experts';
import type { Expert } from '@/constants/experts';

const DAYS: [string, string][] = [
  ['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'],
  ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday'],
];
type DayAvail = { on: boolean; start: number; end: number };
type Availability = Record<string, DayAvail>;

function defaults(): Availability {
  const a: Availability = {};
  for (const [k] of DAYS) a[k] = { on: k !== 'sat' && k !== 'sun', start: 9, end: 17 };
  return a;
}
function hour(h: number) {
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:00 ${h < 12 ? 'AM' : 'PM'}`;
}

export default function ExpertAvailability() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [expert, setExpert] = useState<Expert | null | undefined>(undefined);
  const [avail, setAvail] = useState<Availability>(defaults());
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) {
      getExpertForEmail(user.email).then((e) => {
        setExpert(e);
        if (e?.availability) setAvail({ ...defaults(), ...e.availability });
      });
    } else setExpert(null);
  }, [user?.email]);

  const setDay = (k: string, patch: Partial<DayAvail>) =>
    setAvail((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }));

  const save = async () => {
    if (!expert) return;
    setBusy(true);
    setStatus(null);
    const { error } = await updateExpert(expert.id, { availability: avail });
    setStatus(error ? `Save failed: ${error.message}` : 'Saved. Your available times are stored.');
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.back} onPress={() => router.back()} hitSlop={12}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      {role !== 'expert' && role !== 'admin' ? (
        <View style={styles.center}><Text style={styles.muted}>This area is for experts.</Text></View>
      ) : expert === undefined ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.accent} /></View>
      ) : !expert ? (
        <View style={styles.center}><Text style={styles.muted}>Your expert profile isn't linked yet.</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>AVAILABILITY</Text>
          <Text style={styles.h1}>When are you open?</Text>
          <Text style={styles.sub}>Set the days and hours you take bookings. People booking a call will only see these times.</Text>

          {DAYS.map(([k, label]) => {
            const d = avail[k];
            return (
              <View key={k} style={styles.dayCard}>
                <View style={styles.dayTop}>
                  <Text style={styles.dayName}>{label}</Text>
                  <Switch
                    value={d.on}
                    onValueChange={(v) => setDay(k, { on: v })}
                    trackColor={{ true: COLORS.accent, false: COLORS.line }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                {d.on ? (
                  <View style={styles.range}>
                    <Stepper label="From" value={d.start} onMinus={() => setDay(k, { start: Math.max(0, d.start - 1) })} onPlus={() => setDay(k, { start: Math.min(d.end - 1, d.start + 1) })} display={hour(d.start)} />
                    <Stepper label="To" value={d.end} onMinus={() => setDay(k, { end: Math.max(d.start + 1, d.end - 1) })} onPlus={() => setDay(k, { end: Math.min(23, d.end + 1) })} display={hour(d.end)} />
                  </View>
                ) : (
                  <Text style={styles.closed}>Closed</Text>
                )}
              </View>
            );
          })}

          {status ? <Text style={styles.status}>{status}</Text> : null}
          <Pressable style={[styles.saveBtn, busy && styles.saveOff]} onPress={save} disabled={busy}>
            {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.saveText}>Save availability</Text>}
          </Pressable>
          <Text style={styles.note}>This sets the times inside the app. Connecting your external Google or Apple calendar so it blocks automatically is a separate step we'll add later.</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Stepper({ label, display, onMinus, onPlus }: { label: string; value: number; display: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable style={styles.stepBtn} onPress={onMinus} hitSlop={8}><Ionicons name="remove" size={18} color={COLORS.ink} /></Pressable>
        <Text style={styles.stepperVal}>{display}</Text>
        <Pressable style={styles.stepBtn} onPress={onPlus} hitSlop={8}><Ionicons name="add" size={18} color={COLORS.ink} /></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  back: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  muted: { fontSize: 15, color: COLORS.muted, textAlign: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginBottom: 8 },
  h1: { fontFamily: FONT_SERIF, fontSize: 30, color: COLORS.ink },
  sub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginTop: 8, marginBottom: 20 },
  dayCard: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 12 },
  dayTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayName: { fontFamily: FONT_SERIF, fontSize: 17, color: COLORS.ink },
  range: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, gap: 12 },
  closed: { fontSize: 13, color: COLORS.muted, marginTop: 10 },
  stepper: { flex: 1 },
  stepperLabel: { fontSize: 12, color: COLORS.muted, marginBottom: 6 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 6 },
  stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center' },
  stepperVal: { fontSize: 14, color: COLORS.ink },
  status: { fontSize: 14, color: COLORS.accent, marginTop: 4, marginBottom: 8 },
  saveBtn: { backgroundColor: COLORS.accent, paddingVertical: 16, borderRadius: 999, alignItems: 'center', marginTop: 10 },
  saveOff: { opacity: 0.6 },
  saveText: { color: COLORS.bg, fontSize: 15 },
  note: { fontSize: 12, lineHeight: 18, color: COLORS.muted, marginTop: 14 },
});
