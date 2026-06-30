import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { ACHIEVEMENTS } from '@/constants/achievements';
import { useArticles } from '@/lib/articles';
import { SOUNDS } from '@/constants/sounds';
import { useMyBookings } from '@/lib/bookings';
import { useReads, useListens, useReadStreak } from '@/lib/store';

const TABS = ['Overview', 'Achievements'];
const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type Detail =
  | { key: 'read'; title: string }
  | { key: 'listen'; title: string }
  | { key: 'session'; title: string }
  | { key: 'program'; title: string }
  | null;

export default function ProgressScreen() {
  const router = useRouter();
  const [tab, setTab] = useState('Overview');
  const [detail, setDetail] = useState<Detail>(null);

  const { articles } = useArticles();
  const reads = useReads();
  const listens = useListens();
  const streakInfo = useReadStreak();
  const { items: bookings } = useMyBookings();

  const readItems = useMemo(
    () => reads.map((r) => ({ id: r.id, title: articles.find((a) => a.id === r.id)?.title ?? 'Article', t: r.t })).reverse(),
    [reads, articles]
  );
  const listenItems = useMemo(
    () => listens.map((r) => ({ id: r.id, title: SOUNDS.find((s) => s.id === r.id)?.title ?? 'Sound', t: r.t })).reverse(),
    [listens]
  );
  const sessions = useMemo(() => bookings.filter((b) => b.kind === 'class' || b.kind === 'service'), [bookings]);
  const programs = useMemo(() => bookings.filter((b) => b.kind === 'program'), [bookings]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>You</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Progress</Text>

        <View style={styles.segment}>
          {TABS.map((t) => {
            const on = t === tab;
            return (
              <Pressable key={t} onPress={() => setTab(t)} style={[styles.segItem, on && styles.segItemOn]}>
                <Text style={[styles.segText, on && styles.segTextOn]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'Overview' ? (
          <View>
            <View style={styles.streakCard}>
              <View style={styles.streakTop}>
                <View style={styles.streakBadge}><Text style={styles.streakNum}>{streakInfo.streak}</Text></View>
                <View>
                  <Text style={styles.streakLabel}>DAY STREAK</Text>
                  <Text style={styles.streakHint}>Read an article each day to keep it going</Text>
                </View>
              </View>
              <View style={styles.weekRow}>
                {WEEK.map((d, i) => {
                  const on = streakInfo.week[i];
                  return (
                    <View key={i} style={[styles.dot, on && styles.dotOn]}>
                      {on ? <Ionicons name="checkmark" size={16} color={COLORS.bg} /> : <Text style={styles.dotText}>{d}</Text>}
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.statGrid}>
              <StatCard icon="book-outline" value={String(readItems.length)} label="Articles read" onPress={() => setDetail({ key: 'read', title: 'Articles read' })} />
              <StatCard icon="musical-notes-outline" value={String(listenItems.length)} label="Listened" onPress={() => setDetail({ key: 'listen', title: 'Listened' })} />
              <StatCard icon="calendar-outline" value={String(sessions.length)} label="Sessions" onPress={() => setDetail({ key: 'session', title: 'Sessions' })} />
              <StatCard icon="ribbon-outline" value={String(programs.length)} label="Programs" onPress={() => setDetail({ key: 'program', title: 'Programs' })} />
            </View>
            <Text style={styles.note}>Tap any card to see exactly what you{'\u2019'}ve done.</Text>
          </View>
        ) : (
          <View style={styles.badgeGrid}>
            {ACHIEVEMENTS.map((a) => (
              <View key={a.id} style={styles.badge}>
                <View style={[styles.badgeCircle, !a.unlocked && styles.badgeLocked]}>
                  <Ionicons name={a.icon as any} size={26} color={a.unlocked ? COLORS.accent : COLORS.muted} />
                </View>
                <Text style={styles.badgeTitle}>{a.title}</Text>
                <Text style={styles.badgeState}>{a.unlocked ? 'Unlocked' : 'Locked'}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setDetail(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{detail?.title}</Text>
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {detail?.key === 'read' && (readItems.length === 0
                ? <Empty text="No articles read yet." />
                : readItems.map((r, i) => (
                    <Pressable key={i} style={styles.itemRow} onPress={() => { setDetail(null); router.push(`/article/${r.id}`); }}>
                      <Ionicons name="book-outline" size={18} color={COLORS.accent} />
                      <Text style={styles.itemTitle} numberOfLines={1}>{r.title}</Text>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
                    </Pressable>
                  )))}

              {detail?.key === 'listen' && (listenItems.length === 0
                ? <Empty text="No sounds listened to yet." />
                : listenItems.map((r, i) => (
                    <Pressable key={i} style={styles.itemRow} onPress={() => { setDetail(null); router.push(`/sound/${r.id}`); }}>
                      <Ionicons name="musical-notes-outline" size={18} color={COLORS.accent} />
                      <Text style={styles.itemTitle} numberOfLines={1}>{r.title}</Text>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
                    </Pressable>
                  )))}

              {detail?.key === 'session' && (sessions.length === 0
                ? <Empty text="No sessions yet." />
                : sessions.map((b) => <BookingItem key={b.id} b={b} onRebook={() => { setDetail(null); router.push(b.expert_id ? `/expert/${b.expert_id}` : `/sessions`); }} />))}

              {detail?.key === 'program' && (programs.length === 0
                ? <Empty text="No programs yet." />
                : programs.map((b) => <BookingItem key={b.id} b={b} onRebook={() => { setDetail(null); router.push(b.expert_id ? `/expert/${b.expert_id}` : `/sessions`); }} />))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label, onPress }: { icon: any; value: string; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.statCard} onPress={onPress}>
      <Ionicons name={icon} size={20} color={COLORS.accent} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statView}>View</Text>
    </Pressable>
  );
}

function BookingItem({ b, onRebook }: { b: any; onRebook: () => void }) {
  return (
    <View style={styles.bookingItem}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle} numberOfLines={1}>{b.title}</Text>
        <Text style={styles.itemMeta}>{b.when_text}{b.expert_name ? ` · ${b.expert_name}` : ''}</Text>
      </View>
      <Pressable style={styles.rebookBtn} onPress={onRebook}>
        <Text style={styles.rebookText}>{b.expert_name ? 'Re-book' : 'Browse'}</Text>
      </Pressable>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  h1: { fontFamily: FONT_SERIF, fontSize: 32, color: COLORS.ink, marginBottom: 18 },
  segment: { flexDirection: 'row', backgroundColor: COLORS.accentSoft, borderRadius: 999, padding: 4, marginBottom: 22 },
  segItem: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  segItemOn: { backgroundColor: COLORS.ink },
  segText: { fontSize: 14, color: COLORS.ink },
  segTextOn: { color: COLORS.bg },
  streakCard: { backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, padding: 20, marginBottom: 16 },
  streakTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  streakBadge: { width: 54, height: 54, borderRadius: 16, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  streakNum: { fontFamily: FONT_SERIF, fontSize: 24, color: COLORS.bg },
  streakLabel: { fontSize: 13, letterSpacing: 1.5, color: COLORS.muted },
  streakHint: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dot: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  dotText: { fontSize: 13, color: COLORS.muted },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '48%', backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 18, marginBottom: 12, alignItems: 'center' },
  statValue: { fontFamily: FONT_SERIF, fontSize: 24, color: COLORS.ink, marginTop: 8 },
  statLabel: { fontSize: 12, color: COLORS.muted, marginTop: 6, textAlign: 'center' },
  statView: { fontSize: 11, color: COLORS.accent, marginTop: 8 },
  note: { fontSize: 12, color: COLORS.muted, marginTop: 6 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  badge: { width: '48%', backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 20, marginBottom: 14, alignItems: 'center' },
  badgeCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  badgeLocked: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.line },
  badgeTitle: { fontFamily: FONT_SERIF, fontSize: 15, color: COLORS.ink, textAlign: 'center' },
  badgeState: { fontSize: 12, color: COLORS.muted, marginTop: 4 },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.35)' },
  sheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 14 },
  sheetTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: COLORS.line },
  itemTitle: { flex: 1, fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  itemMeta: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  bookingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, borderTopColor: COLORS.line, gap: 12 },
  rebookBtn: { backgroundColor: COLORS.accent, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999 },
  rebookText: { color: COLORS.bg, fontSize: 13 },
  empty: { fontSize: 14, color: COLORS.muted, paddingVertical: 20, textAlign: 'center' },
});
