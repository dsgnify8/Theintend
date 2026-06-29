import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, FONT_SERIF, USER } from '@/constants/brand';
import { useArticles } from '@/lib/articles';
import { CLASSES, PROGRAMS } from '@/constants/sessions';
import { useBookings, useProgress } from '@/lib/store';

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
  const bookings = useBookings();
  const { map, lastReadId } = useProgress();
  const { articles } = useArticles();

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginBottom: 10 },
  greeting: { fontFamily: FONT_SERIF, fontSize: 34, lineHeight: 40, color: COLORS.ink, marginBottom: 26 },
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
  featuredCard: { width: 220 },
  featuredCover: { height: 140, borderRadius: 18, padding: 16, justifyContent: 'flex-end' },
  featuredCoverTitle: { fontFamily: FONT_SERIF, fontSize: 21, lineHeight: 25, color: '#FFFFFF' },
  featuredName: { fontFamily: FONT_SERIF, fontSize: 15, color: COLORS.ink, marginTop: 10 },
  featuredKind: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
});
