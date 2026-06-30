import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import Slider from '@react-native-community/slider';
import { MOODS } from '@/constants/mood';
import { setMoodToday, useTodayMood } from '@/lib/mood';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, FONT_SERIF, USER } from '@/constants/brand';
import { useArticles } from '@/lib/articles';
import { CLASSES, PROGRAMS } from '@/constants/sessions';
import { useBookings, useProgress, useLastRead } from '@/lib/store';

let promptedThisLaunch = false;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const FEATURED = [
  { kind: 'program' as const, item: PROGRAMS[0] },
  { kind: 'program' as const, item: PROGRAMS[1] },
  { kind: 'class' as const, item: CLASSES[0] },
];

export default function HomeScreen() {
  const router = useRouter();
  const todayMood = useTodayMood();
  const [moodIdx, setMoodIdx] = useState(2);
  const [moodSaved, setMoodSaved] = useState(false);
  useEffect(() => {
    if (todayMood) {
      const i = MOODS.findIndex((m) => m.key === todayMood);
      if (i >= 0) { setMoodIdx(i); setMoodSaved(true); }
    }
  }, [todayMood]);
  const bookings = useBookings();
  const { map, lastReadId } = useProgress();
  const { articles } = useArticles();
  const lastRead = useLastRead();
  const [showResume, setShowResume] = useState(false);
  useEffect(() => {
    if (lastRead && !promptedThisLaunch) { promptedThisLaunch = true; setShowResume(true); }
  }, [lastRead]);

  const upcoming = bookings[0] ?? null;
  const reading = lastReadId ? articles.find((a) => a.id === lastReadId) : null;
  const pct = lastReadId ? Math.round((map[lastReadId] ?? 0) * 100) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>THE INTEND</Text>
        <Text style={styles.greeting}>
          {greeting()}, {USER.name}.
        </Text>

        <View style={styles.moodCard}>
          <Text style={styles.moodQ}>How are you today?</Text>
          <Text style={[styles.moodPick, { color: MOODS[moodIdx].color }]}>{MOODS[moodIdx].label}</Text>
          <Slider
            style={styles.moodSlider}
            minimumValue={0}
            maximumValue={4}
            step={1}
            value={moodIdx}
            minimumTrackTintColor={COLORS.accent}
            maximumTrackTintColor={COLORS.line}
            thumbTintColor={COLORS.accent}
            onValueChange={(v) => setMoodIdx(Math.round(v))}
            onSlidingComplete={(v) => { const i = Math.round(v); setMoodIdx(i); setMoodSaved(true); setMoodToday(MOODS[i].key); }}
          />
          <View style={styles.moodLabels}>
            {MOODS.map((m) => (<Text key={m.key} style={styles.moodTick}>{m.label}</Text>))}
          </View>
          <Text style={styles.moodHint}>{moodSaved ? 'Saved \u2014 one check-in a day.' : 'Drag to check in.'}</Text>
        </View>

        <Text style={styles.label}>UPCOMING SESSION</Text>
        {upcoming ? (
          <Pressable
            style={styles.sessionCard}
            onPress={() =>
              router.push(upcoming.kind === 'program' ? `/program/${upcoming.refId}` : `/class/${upcoming.refId}`)
            }
          >
            <View style={styles.sessionIcon}>
              <Ionicons name="videocam" size={18} color={COLORS.bg} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionTitle}>{upcoming.title}</Text>
              <Text style={styles.sessionMeta}>{upcoming.when}</Text>
              <Text style={styles.sessionMeta}>with {upcoming.expert}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
          </Pressable>
        ) : (
          <Pressable style={styles.emptyCard} onPress={() => router.navigate('/sessions')}>
            <Text style={styles.emptyText}>No sessions booked yet.</Text>
            <Text style={styles.emptyLink}>Browse what's coming up</Text>
          </Pressable>
        )}

        {reading ? (
          <View>
            <Text style={styles.label}>CONTINUE READING</Text>
            <Pressable style={styles.readCard} onPress={() => router.push(`/article/${reading.id}`)}>
              <Text style={styles.readCat}>{reading.category.toUpperCase()}</Text>
              <Text style={styles.readTitle}>{reading.title}</Text>
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: `${Math.max(pct, 3)}%` }]} />
              </View>
              <Text style={styles.pctText}>{pct}% complete</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Text style={styles.label}>START A READ</Text>
            <Pressable style={styles.emptyCard} onPress={() => router.navigate('/read')}>
              <Text style={styles.emptyText}>Open an article and it picks up right here.</Text>
              <Text style={styles.emptyLink}>Go to Library</Text>
            </Pressable>
          </View>
        )}

        {articles.length > 0 ? (
          <View>
            <Text style={styles.section}>What readers are loving</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow} style={{ marginBottom: 28 }}>
              {articles.slice(0, 4).map((a, i) => (
                <Pressable key={a.id} style={styles.featuredCard} onPress={() => router.push(`/article/${a.id}`)}>
                  <View style={styles.readCover}>
                    {a.image ? (
                      <Image source={{ uri: a.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    ) : (
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: ['#5C4632', '#6F7A6B', '#7E6A82', '#7C6F62'][i % 4] }]} />
                    )}
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(28,24,20,0.45)' }]} />
                    <View style={styles.readCoverInner}>
                      <Text style={styles.readCoverCat}>{a.category.toUpperCase()}</Text>
                      <Text style={styles.readCoverTitle} numberOfLines={3}>{a.title}</Text>
                    </View>
                  </View>
                  <Text style={styles.featuredKind}>{a.readMinutes} min read</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <Text style={styles.section}>Featured courses</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
          {FEATURED.map((f) => (
            <Pressable
              key={f.item.id}
              style={styles.featuredCard}
              onPress={() => router.push(f.kind === 'program' ? `/program/${f.item.id}` : `/class/${f.item.id}`)}
            >
              <View style={[styles.featuredCover, { backgroundColor: f.item.color }]}>
                <Text style={styles.featuredCoverTitle}>{f.item.title}</Text>
              </View>
              <Text style={styles.featuredName}>{f.item.expertName}</Text>
              <Text style={styles.featuredKind}>{f.kind === 'program' ? 'Program' : 'Live class'}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </ScrollView>

      <Modal visible={showResume} transparent animationType="fade" onRequestClose={() => setShowResume(false)}>
        <View style={styles.resumeRoot}>
          <Pressable style={styles.resumeBackdrop} onPress={() => setShowResume(false)} />
          <View style={styles.resumeCard}>
            <Ionicons name="book-outline" size={26} color={COLORS.accent} />
            <Text style={styles.resumeTitle}>Pick up where you left off</Text>
            <Text style={styles.resumeBook} numberOfLines={2}>{lastRead?.title}</Text>
            <Pressable style={styles.resumeBtn} onPress={() => { setShowResume(false); if (lastRead) router.push(`/ebook/${lastRead.id}`); }}>
              <Text style={styles.resumeBtnText}>Continue reading</Text>
            </Pressable>
            <Pressable onPress={() => setShowResume(false)} hitSlop={8}><Text style={styles.resumeDismiss}>Not now</Text></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  resumeRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  resumeBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.35)' },
  resumeCard: { width: '100%', backgroundColor: COLORS.bg, borderRadius: 22, padding: 24, alignItems: 'center' },
  resumeTitle: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginTop: 12, textAlign: 'center' },
  resumeBook: { fontSize: 14, color: COLORS.muted, marginTop: 6, marginBottom: 18, textAlign: 'center' },
  resumeBtn: { backgroundColor: COLORS.accent, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 999, alignSelf: 'stretch', alignItems: 'center' },
  resumeBtnText: { color: COLORS.bg, fontSize: 15 },
  resumeDismiss: { fontSize: 14, color: COLORS.muted, marginTop: 14 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginBottom: 10 },
  greeting: { fontFamily: FONT_SERIF, fontSize: 34, lineHeight: 40, color: COLORS.ink, marginBottom: 26 },
  moodCard: { backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, padding: 18, marginBottom: 28 },
  moodQ: { fontSize: 12, letterSpacing: 1.5, color: COLORS.muted, textTransform: 'uppercase' },
  moodPick: { fontFamily: FONT_SERIF, fontSize: 26, marginTop: 6 },
  moodSlider: { width: '100%', height: 40, marginTop: 6 },
  moodLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  moodTick: { fontSize: 11, color: COLORS.muted },
  moodHint: { fontSize: 12, color: COLORS.muted, marginTop: 12 },
  label: { fontSize: 12, letterSpacing: 1.5, color: COLORS.muted, marginBottom: 12 },
  sessionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 28 },
  sessionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  sessionTitle: { fontFamily: FONT_SERIF, fontSize: 17, color: COLORS.ink },
  sessionMeta: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  emptyCard: { backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 18, marginBottom: 28 },
  emptyText: { fontSize: 14, color: COLORS.ink, opacity: 0.85 },
  emptyLink: { fontSize: 14, color: COLORS.accent, marginTop: 8 },
  readCard: { backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 18, marginBottom: 28 },
  readCat: { fontSize: 11, letterSpacing: 1.5, color: COLORS.accent, marginBottom: 8 },
  readTitle: { fontFamily: FONT_SERIF, fontSize: 18, lineHeight: 24, color: COLORS.ink, marginBottom: 14 },
  track: { height: 5, borderRadius: 3, backgroundColor: COLORS.line, overflow: 'hidden' },
  trackFill: { height: 5, backgroundColor: COLORS.accent },
  pctText: { fontSize: 12, color: COLORS.muted, marginTop: 8 },
  section: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginBottom: 14 },
  featuredRow: { gap: 14, paddingRight: 8 },
  readCover: { height: 150, borderRadius: 16, overflow: 'hidden', justifyContent: 'flex-end' },
  readCoverInner: { padding: 14 },
  readCoverCat: { fontSize: 9, letterSpacing: 1.5, color: 'rgba(255,255,255,0.9)', marginBottom: 4 },
  readCoverTitle: { fontFamily: FONT_SERIF, fontSize: 14, lineHeight: 18, color: '#FFFFFF' },
  featuredCard: { width: 220 },
  featuredCover: { height: 140, borderRadius: 18, padding: 16, justifyContent: 'flex-end' },
  featuredCoverTitle: { fontFamily: FONT_SERIF, fontSize: 21, lineHeight: 25, color: '#FFFFFF' },
  featuredName: { fontFamily: FONT_SERIF, fontSize: 15, color: COLORS.ink, marginTop: 10 },
  featuredKind: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
});
