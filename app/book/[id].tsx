import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useExpert } from '@/lib/experts';
import { getCalendarBusy, createCalendarEvent } from '@/lib/calendar';
import { createBooking, useExpertBookings } from '@/lib/bookings';
import { useAuth } from '@/lib/auth';
import { COLORS, FONT_SERIF } from '@/constants/brand';

const SESSION_TYPES = ['Online session', 'In person'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_AHEAD = 14;

function keyFor(y: number, m: number, d: number, h: number) { return `${y}-${m}-${d}-${h}`; }
function hourLabel(h: number) { const hh = ((h + 11) % 12) + 1; return `${hh}:00 ${h < 12 ? 'AM' : 'PM'}`; }
function tzName() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time'; } catch { return 'local time'; } }

function normalizeSlots(day: any): number[] {
  if (!day) return [];
  if (Array.isArray(day.slots)) return day.slots;
  if (day.on === false) return [];
  const start = typeof day.start === 'number' ? day.start : 9;
  const end = typeof day.end === 'number' ? day.end : 17;
  const out: number[] = [];
  for (let h = start; h < end; h++) out.push(h);
  return out;
}

// Human-readable but deterministically parseable, e.g. "Mon, 6 Jul 2026, 2:00 PM"
function formatSlot(d: Date) {
  return `${WD[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${hourLabel(d.getHours())}`;
}
function parseSlot(s: string): Date | null {
  const m = s.match(/(\d{1,2}) (\w{3}) (\d{4}), (\d{1,2}):(\d{2}) (AM|PM)/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const mon = MON.indexOf(m[2]);
  const year = parseInt(m[3], 10);
  let hr = parseInt(m[4], 10) % 12;
  if (m[6] === 'PM') hr += 12;
  if (mon < 0) return null;
  return new Date(year, mon, day, hr, 0, 0, 0);
}

export default function BookScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { expert, loading } = useExpert(String(id));
  const { items: bookings } = useExpertBookings(String(id));
  const { user } = useAuth();

  const [type, setType] = useState(SESSION_TYPES[0]);
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());
  const [dayIdx, setDayIdx] = useState(0);
  const [hour, setHour] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [requested, setRequested] = useState(false);
  const [chosenLabel, setChosenLabel] = useState('');

  // Pull this expert's Google busy times for the booking window.
  useEffect(() => {
    if (!id) return;
    const now = new Date();
    const end = new Date(now); end.setDate(now.getDate() + DAYS_AHEAD + 1);
    getCalendarBusy(String(id), now.toISOString(), end.toISOString())
      .then((r) => {
        if (!r.connected) { setBusyKeys(new Set()); return; }
        const set = new Set<string>();
        for (const b of r.busy) {
          let t = new Date(b.start);
          const bend = new Date(b.end);
          let guard = 0;
          while (t < bend && guard < 800) {
            set.add(keyFor(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours()));
            t = new Date(t.getTime() + 3600000);
            guard++;
          }
        }
        setBusyKeys(set);
      })
      .catch(() => setBusyKeys(new Set()));
  }, [id]);

  // Slots already taken by existing bookings (parsed from their stored time).
  const takenKeys = useMemo(() => {
    const set = new Set<string>();
    for (const b of bookings) {
      const d = parseSlot(b.when_text || '');
      if (d) set.add(keyFor(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()));
    }
    return set;
  }, [bookings]);

  // Project the weekly availability onto real upcoming dates, dropping past,
  // busy and already-booked hours.
  const days = useMemo(() => {
    const avail: any = expert?.availability ?? {};
    const now = new Date();
    const out: { date: Date; hours: number[] }[] = [];
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const d = new Date(now); d.setDate(now.getDate() + i); d.setHours(0, 0, 0, 0);
      const slots = normalizeSlots(avail[WD_KEY[d.getDay()]]);
      const hours = slots.filter((h) => {
        const start = new Date(d); start.setHours(h, 0, 0, 0);
        if (start.getTime() <= now.getTime()) return false;
        const k = keyFor(d.getFullYear(), d.getMonth(), d.getDate(), h);
        return !busyKeys.has(k) && !takenKeys.has(k);
      });
      if (hours.length) out.push({ date: d, hours });
    }
    return out;
  }, [expert?.availability, busyKeys, takenKeys]);

  useEffect(() => { if (dayIdx >= days.length) { setDayIdx(0); setHour(null); } }, [days.length, dayIdx]);

  const confirm = async () => {
    if (!expert || hour == null || !days[dayIdx]) return;
    const slot = new Date(days[dayIdx].date); slot.setHours(hour, 0, 0, 0);
    const label = formatSlot(slot);
    setSaving(true);
    await createBooking({
      refId: String(id), kind: 'service',
      title: `${type} with ${expert.name}`,
      when: label, expert: expert.name, expertId: String(id),
    });
    const startIso = slot.toISOString();
    const endIso = new Date(slot.getTime() + 3600000).toISOString();
    createCalendarEvent({
      expertId: String(id),
      summary: `${type} with ${expert.name} · The Intend`,
      description: 'Booked through The Intend.',
      startIso, endIso,
      attendeeEmail: user?.email ?? undefined,
    }).catch(() => {});
    setChosenLabel(label);
    setRequested(true);
    setSaving(false);
  };

  const active = days[dayIdx];

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
            <Text style={styles.successTitle}>Session requested</Text>
            <Text style={styles.successText}>{chosenLabel}</Text>
            <Text style={styles.successSub}>The team will confirm and arrange payment. You'll see it under Upcoming sessions.</Text>
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

            <Text style={styles.label}>Pick a time</Text>
            {loading ? (
              <View style={styles.loaderBox}><ActivityIndicator color={COLORS.accent} /></View>
            ) : days.length === 0 ? (
              <>
                <Text style={styles.note}>No open times in the next two weeks. Send a request and the team will find a time with you.</Text>
                <Pressable style={[styles.requestBtn, saving && styles.btnOff]} disabled={saving} onPress={async () => {
                  if (!expert) return; setSaving(true);
                  await createBooking({ refId: String(id), kind: 'service', title: `${type} with ${expert.name}`, when: 'Time to be confirmed', expert: expert.name, expertId: String(id) });
                  setChosenLabel('Time to be confirmed'); setRequested(true); setSaving(false);
                }}>
                  {saving ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.requestText}>Send a request</Text>}
                </Pressable>
              </>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
                  {days.map((d, i) => {
                    const on = i === dayIdx;
                    return (
                      <Pressable key={i} onPress={() => { setDayIdx(i); setHour(null); }} style={[styles.datePill, on && styles.datePillOn]}>
                        <Text style={[styles.dateWd, on && styles.dateOnText]}>{WD[d.date.getDay()]}</Text>
                        <Text style={[styles.dateNum, on && styles.dateOnText]}>{d.date.getDate()}</Text>
                        <Text style={[styles.dateMon, on && styles.dateOnText]}>{MON[d.date.getMonth()]}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={styles.slotGrid}>
                  {active?.hours.map((h) => {
                    const on = h === hour;
                    return (
                      <Pressable key={h} onPress={() => setHour(h)} style={[styles.slot, on && styles.slotOn]}>
                        <Text style={[styles.slotText, on && styles.slotTextOn]}>{hourLabel(h)}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.tzNote}>Times shown in {tzName()}. Busy times from the expert's Google Calendar are hidden.</Text>

                <Pressable style={[styles.requestBtn, (hour == null || saving) && styles.btnOff]} disabled={hour == null || saving} onPress={confirm}>
                  {saving ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.requestText}>Confirm booking</Text>}
                </Pressable>
              </>
            )}
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
  loaderBox: { paddingVertical: 30, alignItems: 'center' },
  note: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginTop: 4 },
  dateRow: { gap: 10, paddingVertical: 2, paddingRight: 8 },
  datePill: { width: 62, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card, alignItems: 'center' },
  datePillOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  dateWd: { fontSize: 11, color: COLORS.muted },
  dateNum: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginVertical: 2 },
  dateMon: { fontSize: 11, color: COLORS.muted },
  dateOnText: { color: COLORS.bg },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  slot: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card },
  slotOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  slotText: { fontSize: 13, color: COLORS.ink },
  slotTextOn: { color: COLORS.bg },
  tzNote: { fontSize: 12, lineHeight: 18, color: COLORS.muted, marginTop: 14 },
  requestBtn: { marginTop: 20, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.accent, alignItems: 'center' },
  btnOff: { opacity: 0.5 },
  requestText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  successCard: { backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, padding: 24, marginTop: 28, alignItems: 'center' },
  successTitle: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginTop: 12, marginBottom: 8 },
  successText: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.accent, textAlign: 'center' },
  successSub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, textAlign: 'center', marginTop: 8 },
  doneBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 999, borderWidth: 1, borderColor: COLORS.ink },
  doneText: { fontSize: 14, color: COLORS.ink },
});

