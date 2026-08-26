import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { getExpertForEmail, updateExpert } from '@/lib/experts';
import { CalendarConnect } from '@/components/CalendarConnect';
import type { Expert } from '@/constants/experts';

const DAYS: [string, string][] = [
  ['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'],
  ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday'],
];

// Every quarter hour, which is the finest a session start can land on.
const STEP = 15;
const DAY_MIN = 0;
const DAY_MAX = 24 * 60;

type DayRange = { on: boolean; startMin: number; endMin: number };
type Availability = { days: Record<string, DayRange>; blockedDates: string[] };

function label(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hh = ((h + 11) % 12) + 1;
  const mm = m < 10 ? '0' + m : String(m);
  return hh + ':' + mm + ' ' + (h < 12 ? 'AM' : 'PM');
}

// Reads whatever shape is already saved. Older rows carry hour blocks in
// `slots` or a start/end pair in whole hours, and both still have to open.
function readDay(d: any): DayRange {
  if (!d) return { on: false, startMin: 540, endMin: 1020 };
  if (typeof d.startMin === 'number' && typeof d.endMin === 'number') {
    return { on: d.on !== false, startMin: d.startMin, endMin: d.endMin };
  }
  if (Array.isArray(d.slots) && d.slots.length) {
    const lo = Math.min.apply(null, d.slots);
    const hi = Math.max.apply(null, d.slots) + 1;
    return { on: true, startMin: lo * 60, endMin: hi * 60 };
  }
  const s = typeof d.start === 'number' ? d.start : 9;
  const e = typeof d.end === 'number' ? d.end : 17;
  return { on: d.on !== false, startMin: s * 60, endMin: e * 60 };
}

function readAvail(raw: any): Availability {
  const days: Record<string, DayRange> = {};
  for (const [k] of DAYS) {
    const src = raw && raw.days ? raw.days[k] : raw ? raw[k] : null;
    if (src) days[k] = readDay(src);
    else days[k] = { on: k !== 'sat' && k !== 'sun', startMin: 540, endMin: 1020 };
  }
  const blocked = raw && Array.isArray(raw.blockedDates) ? raw.blockedDates : [];
  return { days, blockedDates: blocked };
}

// yyyy-mm-dd in the expert's own zone, so a date they tap is the date they meant.
function dateKey(d: Date) {
  const m = d.getMonth() + 1;
  const dd = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (dd < 10 ? '0' + dd : dd);
}
const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dateLabel(d: Date) {
  return WD_SHORT[d.getDay()] + ', ' + d.getDate() + ' ' + MON_SHORT[d.getMonth()];
}

function tzName() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local time'; } catch { return 'your local time'; }
}

export default function ExpertAvailability() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [expert, setExpert] = useState<Expert | null | undefined>(undefined);
  const [avail, setAvail] = useState<Availability>(() => readAvail(null));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  // Which time is being chosen: the day key and which end of the range.
  const [picking, setPicking] = useState<{ day: string; edge: 'start' | 'end' } | null>(null);
  const [datesOpen, setDatesOpen] = useState(false);

  useEffect(() => {
    if (user?.email) {
      getExpertForEmail(user.email).then((e) => {
        setExpert(e);
        if (e?.availability) setAvail(readAvail(e.availability));
      });
    } else setExpert(null);
  }, [user?.email]);

  // The next two months, for choosing days off.
  const upcoming = useMemo(() => {
    const out: Date[] = [];
    const t = new Date(); t.setHours(0, 0, 0, 0);
    for (let i = 0; i < 60; i++) {
      const d = new Date(t); d.setDate(t.getDate() + i);
      out.push(d);
    }
    return out;
  }, []);

  const setDay = (k: string, patch: Partial<DayRange>) =>
    setAvail((p) => ({ ...p, days: { ...p.days, [k]: { ...p.days[k], ...patch } } }));

  const copyToAll = () => {
    const src = avail.days.mon;
    setAvail((p) => {
      const days: Record<string, DayRange> = {};
      for (const [k] of DAYS) days[k] = { ...p.days[k], startMin: src.startMin, endMin: src.endMin };
      return { ...p, days };
    });
  };

  const toggleDate = (key: string) =>
    setAvail((p) => ({
      ...p,
      blockedDates: p.blockedDates.includes(key)
        ? p.blockedDates.filter((x) => x !== key)
        : [...p.blockedDates, key].sort(),
    }));

  const save = async () => {
    if (!expert) return;
    setBusy(true);
    setStatus(null);
    // Written with both shapes. `days` is what this screen reads back, and the
    // per-key hour blocks keep anything still reading the old shape working.
    const out: any = { days: {}, blockedDates: avail.blockedDates };
    for (const [k] of DAYS) {
      const d = avail.days[k];
      out.days[k] = { on: d.on, startMin: d.startMin, endMin: d.endMin };
      const slots: number[] = [];
      if (d.on) {
        for (let h = Math.floor(d.startMin / 60); h < Math.ceil(d.endMin / 60); h++) slots.push(h);
      }
      out[k] = { on: d.on, start: Math.floor(d.startMin / 60), end: Math.ceil(d.endMin / 60), slots };
    }
    const { error } = await updateExpert(expert.id, { availability: out });
    setStatus(error ? 'Save failed: ' + error.message : 'Saved.');
    setBusy(false);
  };

  // Times offered in the picker. The end of a day can be midnight, the start
  // cannot, so the two lists differ by one entry.
  const pickTimes = useMemo(() => {
    const out: number[] = [];
    const last = picking?.edge === 'end' ? DAY_MAX : DAY_MAX - STEP;
    for (let m = DAY_MIN; m <= last; m += STEP) out.push(m);
    return out;
  }, [picking?.edge]);

  const onPick = (m: number) => {
    if (!picking) return;
    const d = avail.days[picking.day];
    if (picking.edge === 'start') {
      setDay(picking.day, { startMin: m, endMin: Math.max(d.endMin, m + STEP) });
    } else {
      setDay(picking.day, { endMin: m, startMin: Math.min(d.startMin, m - STEP) });
    }
    setPicking(null);
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
          <Text style={styles.h1}>Your calendar</Text>
          <Text style={styles.sub}>
            Set the hours you are open on each day. Everything already in your Google Calendar blocks
            itself, so this is only the outer window. Times in {tzName()}.
          </Text>

          <CalendarConnect expertId={expert.id} />

          <View style={styles.sectionTop}>
            <Text style={styles.sectionLabel}>YOUR HOURS</Text>
            <Pressable onPress={copyToAll} hitSlop={8}>
              <Text style={styles.action}>Copy Monday to all</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            {DAYS.map(([k, name], i) => {
              const d = avail.days[k];
              return (
                <View key={k} style={[styles.dayRow, i === DAYS.length - 1 && styles.dayRowLast]}>
                  <View style={styles.dayHead}>
                    <Text style={styles.dayName}>{name}</Text>
                    <Switch
                      value={d.on}
                      onValueChange={(v) => setDay(k, { on: v })}
                      trackColor={{ false: COLORS.line, true: '#1A1A1A' }}
                      thumbColor={COLORS.card}
                    />
                  </View>
                  {d.on ? (
                    <View style={styles.timeRow}>
                      <Pressable style={styles.timeBtn} onPress={() => setPicking({ day: k, edge: 'start' })}>
                        <Text style={styles.timeText}>{label(d.startMin)}</Text>
                      </Pressable>
                      <Text style={styles.toText}>to</Text>
                      <Pressable style={styles.timeBtn} onPress={() => setPicking({ day: k, edge: 'end' })}>
                        <Text style={styles.timeText}>{label(d.endMin)}</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Text style={styles.closed}>Closed</Text>
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.sectionTop}>
            <Text style={styles.sectionLabel}>DAYS OFF</Text>
            <Pressable onPress={() => setDatesOpen(true)} hitSlop={8}>
              <Text style={styles.action}>Choose dates</Text>
            </Pressable>
          </View>
          <View style={styles.card}>
            {avail.blockedDates.length === 0 ? (
              <Text style={styles.emptyDates}>
                No days off. A day chosen here is closed whatever your Google Calendar says.
              </Text>
            ) : (
              <View style={styles.chipWrap}>
                {avail.blockedDates.map((key) => {
                  const parts = key.split('-');
                  const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                  return (
                    <Pressable key={key} style={styles.chip} onPress={() => toggleDate(key)}>
                      <Text style={styles.chipText}>{dateLabel(dt)}</Text>
                      <Ionicons name="close" size={13} color={COLORS.muted} />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {status ? <Text style={styles.status}>{status}</Text> : null}
          <Pressable style={[styles.saveBtn, busy && styles.saveOff]} onPress={save} disabled={busy}>
            {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.saveText}>Save availability</Text>}
          </Pressable>
          <Text style={styles.note}>
            Clients see start times every quarter hour inside these windows, and only where the whole
            session fits without touching anything already on your Google Calendar.
          </Text>
        </ScrollView>
      )}

      <Modal visible={!!picking} transparent animationType="slide" onRequestClose={() => setPicking(null)}>
        <View style={styles.sheetRoot}>
          <Pressable style={styles.backdrop} onPress={() => setPicking(null)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>
              {picking?.edge === 'start' ? 'Opens at' : 'Closes at'}
            </Text>
            <ScrollView style={styles.pickScroll} showsVerticalScrollIndicator={false}>
              {pickTimes.map((m) => {
                const cur = picking ? avail.days[picking.day][picking.edge === 'start' ? 'startMin' : 'endMin'] : -1;
                const on = m === cur;
                return (
                  <Pressable key={m} style={[styles.pickRow, on && styles.pickRowOn]} onPress={() => onPick(m)}>
                    <Text style={[styles.pickText, on && styles.pickTextOn]}>{m === DAY_MAX ? '12:00 AM' : label(m)}</Text>
                    {on ? <Ionicons name="checkmark" size={17} color={COLORS.bg} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={datesOpen} transparent animationType="slide" onRequestClose={() => setDatesOpen(false)}>
        <View style={styles.sheetRoot}>
          <Pressable style={styles.backdrop} onPress={() => setDatesOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Days off</Text>
            <Text style={styles.sheetSub}>Tap a date to close it. Tap again to open it.</Text>
            <ScrollView style={styles.pickScroll} showsVerticalScrollIndicator={false}>
              {upcoming.map((d) => {
                const key = dateKey(d);
                const off = avail.blockedDates.includes(key);
                return (
                  <Pressable key={key} style={[styles.pickRow, off && styles.pickRowOn]} onPress={() => toggleDate(key)}>
                    <Text style={[styles.pickText, off && styles.pickTextOn]}>{dateLabel(d)}</Text>
                    {off ? <Ionicons name="checkmark" size={17} color={COLORS.bg} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.doneBtn} onPress={() => setDatesOpen(false)}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  sectionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 10 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.5, color: COLORS.muted },
  action: { fontSize: 13, color: COLORS.accent },
  card: { backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 16 },
  dayRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  dayRowLast: { borderBottomWidth: 0 },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayName: { fontFamily: FONT_SERIF, fontSize: 17, color: COLORS.ink },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  timeBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.bg, alignItems: 'center' },
  timeText: { fontSize: 14, color: COLORS.ink },
  toText: { fontSize: 13, color: COLORS.muted },
  closed: { fontSize: 13, color: COLORS.muted, marginTop: 8 },
  emptyDates: { fontSize: 13, lineHeight: 20, color: COLORS.muted, paddingVertical: 16 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.bg },
  chipText: { fontSize: 13, color: COLORS.ink },
  status: { fontSize: 14, color: COLORS.accent, marginTop: 18, marginBottom: 4, textAlign: 'center' },
  saveBtn: { backgroundColor: '#1A1A1A', paddingVertical: 16, borderRadius: 999, alignItems: 'center', marginTop: 16 },
  saveOff: { opacity: 0.6 },
  saveText: { color: COLORS.bg, fontSize: 15 },
  note: { fontSize: 12, lineHeight: 18, color: COLORS.muted, marginTop: 16 },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.35)' },
  sheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 32, maxHeight: '75%' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 16 },
  sheetTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginBottom: 6 },
  sheetSub: { fontSize: 13, color: COLORS.muted, marginBottom: 12 },
  pickScroll: { marginTop: 6 },
  pickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 16, borderRadius: 12, marginBottom: 6, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  pickRowOn: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  pickText: { fontSize: 15, color: COLORS.ink },
  pickTextOn: { color: COLORS.bg },
  doneBtn: { backgroundColor: '#1A1A1A', paddingVertical: 15, borderRadius: 999, alignItems: 'center', marginTop: 12 },
  doneText: { color: COLORS.bg, fontSize: 15 },
});
