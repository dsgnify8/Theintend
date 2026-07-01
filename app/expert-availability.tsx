import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { getExpertForEmail, updateExpert } from '@/lib/experts';
import { getCalendarBusy } from '@/lib/calendar';
import { CalendarConnect } from '@/components/CalendarConnect';
import type { Expert } from '@/constants/experts';

const DAYS: [string, string][] = [
  ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'],
  ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun'],
];
const FULL: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
// Bookable window shown as blocks (each block = one hour you turn on/off).
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7am … 10pm

type DayAvail = { on: boolean; start: number; end: number; slots: number[] };
type Availability = Record<string, DayAvail>;

function rangeSlots(start: number, end: number) {
  const out: number[] = [];
  for (let h = start; h < end; h++) out.push(h);
  return out;
}
function normalize(d: any): DayAvail {
  const start = typeof d?.start === 'number' ? d.start : 9;
  const end = typeof d?.end === 'number' ? d.end : 17;
  const slots: number[] = Array.isArray(d?.slots) ? d.slots : rangeSlots(start, end);
  const on = d?.on ?? slots.length > 0;
  return { on, start, end, slots };
}
function defaults(): Availability {
  const a: Availability = {};
  for (const [k] of DAYS) {
    const open = k !== 'sat' && k !== 'sun';
    a[k] = { on: open, start: 9, end: 17, slots: open ? rangeSlots(9, 17) : [] };
  }
  return a;
}
function hour(h: number) {
  const hh = ((h + 11) % 12) + 1;
  return `${hh} ${h < 12 ? 'AM' : 'PM'}`;
}
function tzName() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local time'; } catch { return 'your local time'; }
}

export default function ExpertAvailability() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [expert, setExpert] = useState<Expert | null | undefined>(undefined);
  const [avail, setAvail] = useState<Availability>(defaults());
  const [selected, setSelected] = useState<string>('mon');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busyMap, setBusyMap] = useState<Record<string, Set<number>>>({});

  useEffect(() => {
    if (user?.email) {
      getExpertForEmail(user.email).then((e) => {
        setExpert(e);
        if (e?.availability) {
          const merged: Availability = { ...defaults() };
          for (const [k] of DAYS) if ((e.availability as any)[k]) merged[k] = normalize((e.availability as any)[k]);
          setAvail(merged);
        }
      });
    } else setExpert(null);
  }, [user?.email]);

  useEffect(() => {
    if (!expert?.id) return;
    const now = new Date();
    const dow = now.getDay(); // 0 Sun … 6 Sat
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dow + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);
    getCalendarBusy(expert.id, monday.toISOString(), nextMonday.toISOString())
      .then((r) => {
        if (!r.connected) { setBusyMap({}); return; }
        const map: Record<string, Set<number>> = {};
        const idxToKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        for (const b of r.busy) {
          let t = new Date(b.start);
          const end = new Date(b.end);
          let guard = 0;
          while (t < end && guard < 400) {
            const key = idxToKey[t.getDay()];
            if (!map[key]) map[key] = new Set<number>();
            map[key].add(t.getHours());
            t = new Date(t.getTime() + 3600000);
            guard++;
          }
        }
        setBusyMap(map);
      })
      .catch(() => setBusyMap({}));
  }, [expert?.id]);

  const toggleSlot = (k: string, h: number) =>
    setAvail((prev) => {
      const day = prev[k];
      const has = day.slots.includes(h);
      const slots = has ? day.slots.filter((x) => x !== h) : [...day.slots, h].sort((a, b) => a - b);
      return { ...prev, [k]: { ...day, slots, on: slots.length > 0 } };
    });

  const setAllDay = (k: string, on: boolean) =>
    setAvail((prev) => ({ ...prev, [k]: { ...prev[k], on, slots: on ? rangeSlots(9, 17) : [] } }));

  const save = async () => {
    if (!expert) return;
    setBusy(true);
    setStatus(null);
    // Keep start/end in sync (from the blocks) for anything that reads a range.
    const out: Availability = {} as any;
    for (const [k] of DAYS) {
      const d = avail[k];
      const start = d.slots.length ? Math.min(...d.slots) : 9;
      const end = d.slots.length ? Math.max(...d.slots) + 1 : 17;
      out[k] = { on: d.slots.length > 0, start, end, slots: d.slots };
    }
    const { error } = await updateExpert(expert.id, { availability: out });
    setStatus(error ? `Save failed: ${error.message}` : 'Saved.');
    setBusy(false);
  };

  const d = avail[selected];
  const busyHours = busyMap[selected] || new Set<number>();
  const anyBusy = Object.keys(busyMap).length > 0;

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
          <Text style={styles.h1}>Your calendar</Text>
          <Text style={styles.sub}>Connect Google Calendar, or tap the time blocks below to turn each hour on or off. All times in {tzName()}.</Text>

          <CalendarConnect expertId={expert.id} />

          <Text style={styles.weekLabel}>YOUR WEEK</Text>
          <View style={styles.weekStrip}>
            {DAYS.map(([k, label]) => {
              const on = avail[k]?.slots.length > 0;
              const sel = k === selected;
              return (
                <Pressable key={k} onPress={() => setSelected(k)} style={[styles.dayPill, sel && styles.dayPillSel]}>
                  <Text style={[styles.dayPillText, sel && styles.dayPillTextSel]}>{label}</Text>
                  <View style={[styles.dayDot, on ? styles.dayDotOn : styles.dayDotOff, sel && on && styles.dayDotSel]} />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.editor}>
            <View style={styles.editorTop}>
              <Text style={styles.editorDay}>{FULL[selected]}</Text>
              <Pressable onPress={() => setAllDay(selected, d.slots.length === 0)} hitSlop={8}>
                <Text style={styles.editorToggle}>{d.slots.length === 0 ? 'Open 9–5' : 'Clear day'}</Text>
              </Pressable>
            </View>
            <Text style={styles.editorHint}>Tap an hour to make it available. Tap again to block it.</Text>
            <View style={styles.grid}>
              {HOURS.map((h) => {
                const on = d.slots.includes(h);
                const isBusy = busyHours.has(h);
                return (
                  <Pressable key={h} onPress={() => toggleSlot(selected, h)} style={[styles.block, on ? styles.blockOn : styles.blockOff, isBusy && styles.blockBusy]}>
                    <Text style={[styles.blockText, on && styles.blockTextOn]}>{hour(h)}</Text>
                    {isBusy ? <View style={styles.busyDot} /> : null}
                  </Pressable>
                );
              })}
            </View>
            {anyBusy ? (
              <View style={styles.legend}>
                <View style={styles.busyDotLegend} />
                <Text style={styles.legendText}>Amber dot: you're busy in Google this week</Text>
              </View>
            ) : null}
          </View>

          {status ? <Text style={styles.status}>{status}</Text> : null}
          <Pressable style={[styles.saveBtn, busy && styles.saveOff]} onPress={save} disabled={busy}>
            {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.saveText}>Save availability</Text>}
          </Pressable>
          <Text style={styles.note}>When Google Calendar is connected, the hours you're already busy this week are marked in amber. Times use {tzName()} to stay in sync with your calendar.</Text>
        </ScrollView>
      )}
    </SafeAreaView>
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
  sub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginTop: 8, marginBottom: 18 },
  weekLabel: { fontSize: 11, letterSpacing: 1.5, color: COLORS.muted, marginTop: 22, marginBottom: 10 },
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  dayPill: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card },
  dayPillSel: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  dayPillText: { fontSize: 12, color: COLORS.ink },
  dayPillTextSel: { color: COLORS.bg },
  dayDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  dayDotOn: { backgroundColor: COLORS.accent },
  dayDotOff: { backgroundColor: COLORS.line },
  dayDotSel: { backgroundColor: COLORS.bg },
  editor: { backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 18, marginTop: 16 },
  editorTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editorDay: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink },
  editorToggle: { fontSize: 13, color: COLORS.accent },
  editorHint: { fontSize: 12, color: COLORS.muted, marginTop: 6, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  block: { width: '22%', paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  blockOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  blockOff: { backgroundColor: 'transparent', borderColor: COLORS.line },
  blockText: { fontSize: 12, color: COLORS.muted },
  blockBusy: { borderColor: '#C08A3E' },
  busyDot: { position: 'absolute', top: 5, right: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: '#C08A3E' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  busyDotLegend: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C08A3E' },
  legendText: { fontSize: 12, color: COLORS.muted },
  blockTextOn: { color: COLORS.bg },
  status: { fontSize: 14, color: COLORS.accent, marginTop: 14, marginBottom: 4, textAlign: 'center' },
  saveBtn: { backgroundColor: COLORS.accent, paddingVertical: 16, borderRadius: 999, alignItems: 'center', marginTop: 12 },
  saveOff: { opacity: 0.6 },
  saveText: { color: COLORS.bg, fontSize: 15 },
  note: { fontSize: 12, lineHeight: 18, color: COLORS.muted, marginTop: 16 },
});

