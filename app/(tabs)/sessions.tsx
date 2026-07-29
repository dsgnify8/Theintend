import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { SESSION_CATEGORIES } from '@/constants/sessions';
import { HIGHLIGHTS, type Highlight } from '@/constants/highlights';
import { useSessions } from '@/lib/sessions';
import { useService, useServices } from '@/lib/services';
import { EXPERTS } from '@/constants/experts';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT_ITALIC, FONT_SERIF } from '@/constants/brand';

const TABS = ['One to one', 'Programs'];

// "60 Minute Session (5 sessions)" reads as "60 Minute Session" here, because
// the count is already shown in the pill above.
function stripSessionCount(title: string): string {
  return (title || '').replace(/\s*\(\d+\s*sessions?\)\s*$/i, '').trim();
}

// A soft wash behind each card, warm at the top and clearing towards the copy.
const CARD_WASH = ['rgba(107,97,87,0.16)', 'rgba(107,97,87,0.05)', 'rgba(107,97,87,0)'];
// Seeded demo programs are not shown in the live Programs feed.
const DEMO_PROGRAM_IDS = ['nervous-system-reset', 'building-self-worth', 'feminine-embodiment'];
// Only these packages are featured in the public Programs feed.
const FEED_PROGRAM_IDS = ['alev-body-pack', 'alev-lilith', 'alev-moana'];

type FeedProgram = {
  key: string;
  title: string;
  expertName: string;
  pills: string[];
  price: string;
  sessions: number;
  category?: string;
  onPress: () => void;
};

export default function SessionsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState('One to one');
  const [filterOpen, setFilterOpen] = useState(false);
  const [cats, setCats] = useState<string[]>([]);
  const [maxSessions, setMaxSessions] = useState(10);
  const { programs: PROGRAMS } = useSessions();
  const { services } = useServices();
  const isOneToOne = tab === 'One to one';

  const expertName = (eid: string) => EXPERTS.find((e) => e.id === eid)?.name ?? '';

  // Programs feed: every multi-session package, plus any approved or uploaded
  // programs from the sessions table. Seeded demo programs are excluded.
  const programItems = useMemo<FeedProgram[]>(() => {
    const fromPackages: FeedProgram[] = services
      .filter((s: any) => s.kind === 'package' && FEED_PROGRAM_IDS.includes(s.id))
      .map((s: any) => ({
        key: s.id,
        title: s.name,
        expertName: expertName(s.expertId),
        pills: [s.tagline, s.sessionsTotal ? `${s.sessionsTotal} sessions` : ''].filter(Boolean) as string[],
        price: s.price,
        sessions: s.sessionsTotal ?? 0,
        category: undefined,
        onPress: () => router.push(`/book/${s.expertId}?service=${s.id}`),
      }));
    const fromPrograms: FeedProgram[] = PROGRAMS
      .filter((p: any) => !DEMO_PROGRAM_IDS.includes(p.id))
      .map((p: any) => ({
        key: p.id,
        title: p.title,
        expertName: p.expertName,
        pills: [`${p.weeks} weeks`, `${p.sessions} sessions`, p.cadence].filter(Boolean) as string[],
        price: p.price,
        sessions: p.sessions ?? 0,
        category: p.category,
        onPress: () => router.push(`/program/${p.id}?fromList=1`),
      }));
    return [...fromPackages, ...fromPrograms];
  }, [services, PROGRAMS]);

  const toggleCat = (c: string) =>
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const filteredPrograms = programItems.filter(
    (p) => (cats.length === 0 || (p.category ? cats.includes(p.category) : true)) && p.sessions <= maxSessions
  );

  const clearAll = () => {
    setCats([]);
    setMaxSessions(10);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Text style={styles.kicker}>THE INTEND</Text>
          {!isOneToOne ? (
            <Pressable style={styles.filterBtn} onPress={() => setFilterOpen(true)} hitSlop={10}>
              <Ionicons name="options-outline" size={20} color={COLORS.ink} />
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.h1}>Sessions</Text>
        <Text style={styles.sub}>One to one sessions and guided programs with your experts.</Text>

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

        {isOneToOne ? (
          HIGHLIGHTS.map((h) => <HighlightCard key={h.serviceId} item={h} />)
        ) : filteredPrograms.length > 0 ? (
          filteredPrograms.map((p) => <ProgramCard key={p.key} item={p} />)
        ) : (
          <View style={styles.noResult}>
            <Text style={styles.noResultText}>No programs match these filters yet.</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setFilterOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Filter programs</Text>

            <Text style={styles.filterLabel}>Categories</Text>
            <View style={styles.catWrap}>
              {SESSION_CATEGORIES.map((c) => {
                const on = cats.includes(c);
                return (
                  <Pressable key={c} onPress={() => toggleCat(c)} style={[styles.catChip, on && styles.catChipOn]}>
                    <Text style={[styles.catText, on && styles.catTextOn]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>

            {(
              <View>
                <Text style={styles.filterLabel}>Sessions {'\u00B7'} up to {maxSessions}</Text>
                <Slider
                  minimumValue={1}
                  maximumValue={10}
                  step={1}
                  value={maxSessions}
                  onValueChange={setMaxSessions}
                  minimumTrackTintColor={COLORS.accent}
                  maximumTrackTintColor={COLORS.line}
                  thumbTintColor={COLORS.accent}
                />
              </View>
            )}

            <View style={styles.sheetActions}>
              <Pressable onPress={clearAll}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
              <Pressable style={styles.applyBtn} onPress={() => setFilterOpen(false)}>
                <Text style={styles.applyText}>Show results</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function HighlightCard({ item }: { item: Highlight }) {
  const router = useRouter();
  const expert = EXPERTS.find((e) => e.id === item.expertId);
  const svc = useService(item.serviceId);
  // "90 minutes with Omar" splits so the duration can sit quietly above the
  // name, which then gets the display face to itself.
  const parts = item.title.match(/^(.*?)\s+with\s+(.+)$/i);
  const lead = item.lead ?? (parts ? parts[1] : null);
  const name = parts ? parts[2] : item.title;
  return (
    <Pressable
      style={styles.hCard}
      onPress={() => router.push(`/book/${item.expertId}?service=${item.serviceId}`)}
    >
      <LinearGradient colors={CARD_WASH} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={styles.hHead}>
        {lead ? <Text style={styles.hLead}>{lead.toUpperCase()}</Text> : null}
        <Text style={styles.hName}>
          {parts ? <Text style={styles.hWith}>with </Text> : null}{name}
        </Text>
      </View>
      <Text style={styles.hCopy}>{item.copy}</Text>
      <View style={styles.hFoot}>
        <Text style={styles.hExpert}>{expert?.name ?? ''}</Text>
        {item.free ? (
          <Text style={styles.freeTag}>FREE</Text>
        ) : svc?.price ? (
          <Text style={styles.hPrice}>{svc.price}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function ProgramCard({ item }: { item: FeedProgram }) {
  return (
    <Pressable style={styles.hCard} onPress={item.onPress}>
      <LinearGradient colors={CARD_WASH} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={styles.metaRow}>
        {item.pills.map((p, i) => <Text key={i} style={styles.pill}>{p}</Text>)}
      </View>
      <Text style={styles.programTitle}>{stripSessionCount(item.title)}</Text>
      <View style={styles.hFoot}>
        <Text style={styles.hExpert}>{item.expertName}</Text>
        <Text style={styles.hPrice}>{item.price}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginBottom: 10 },
  filterBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  h1: { fontFamily: FONT_SERIF, fontSize: 34, lineHeight: 40, color: COLORS.ink },
  sub: { fontSize: 15, lineHeight: 22, color: COLORS.muted, marginTop: 8, marginBottom: 18 },
  segment: { flexDirection: 'row', backgroundColor: COLORS.accentSoft, borderRadius: 999, padding: 4, marginBottom: 20 },
  segItem: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  segItemOn: { backgroundColor: COLORS.ink },
  segText: { fontSize: 14, color: COLORS.ink },
  segTextOn: { color: COLORS.bg },
  card: { backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, overflow: 'hidden', marginBottom: 16 },
  cover: { height: 130, padding: 18, justifyContent: 'flex-end' },
  coverTitle: { fontFamily: FONT_SERIF, fontSize: 24, lineHeight: 28, color: '#FFFFFF' },
  coverScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.32)' },
  cardBody: { padding: 18 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pill: { fontSize: 12, color: COLORS.ink, backgroundColor: COLORS.accentSoft, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, overflow: 'hidden' },
  programTitle: { fontFamily: FONT_SERIF, fontSize: 25, lineHeight: 31, color: COLORS.ink, marginTop: 2 },
  expert: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  going: { fontSize: 13, color: COLORS.muted, marginTop: 6 },
  hCard: { backgroundColor: COLORS.card, borderRadius: 22, borderWidth: 1, borderColor: COLORS.line, overflow: 'hidden', padding: 22, marginBottom: 14 },
  hHead: { marginBottom: 14 },
  hLead: { fontSize: 10, letterSpacing: 2.4, color: COLORS.muted, marginBottom: 8 },
  hName: { fontFamily: FONT_SERIF, fontSize: 27, lineHeight: 33, color: COLORS.ink },
  hWith: { fontFamily: FONT_ITALIC, fontSize: 24, color: COLORS.muted },
  hCopy: { fontSize: 14, lineHeight: 22, color: COLORS.ink, opacity: 0.8 },
  hFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, borderTopWidth: 1, borderTopColor: COLORS.line, paddingTop: 14 },
  hExpert: { fontSize: 13, color: COLORS.muted },
  hPrice: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  freeTag: { fontSize: 10, letterSpacing: 1.6, color: COLORS.accent, backgroundColor: COLORS.accentSoft, paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999, overflow: 'hidden' },
  noResult: { backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 24, alignItems: 'center' },
  noResultText: { fontSize: 14, color: COLORS.muted },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.35)' },
  sheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 36, borderTopWidth: 1, borderColor: COLORS.line },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 16 },
  sheetTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginBottom: 18 },
  filterLabel: { fontSize: 13, letterSpacing: 0.5, color: COLORS.muted, marginBottom: 12, marginTop: 14 },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card },
  catChipOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  catText: { fontSize: 13, color: COLORS.ink },
  catTextOn: { color: COLORS.bg },
  sheetActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 },
  clearText: { fontSize: 15, color: COLORS.muted },
  applyBtn: { backgroundColor: COLORS.taupeBlue, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 999 },
  applyText: { color: COLORS.bg, fontSize: 15 },
});
