import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { SESSION_CATEGORIES, type SessionClass, type Program } from '@/constants/sessions';
import { useSessions } from '@/lib/sessions';
import { COLORS, FONT_SERIF } from '@/constants/brand';

const TABS = ['Classes', 'Programs'];

export default function SessionsScreen() {
  const [tab, setTab] = useState('Classes');
  const [filterOpen, setFilterOpen] = useState(false);
  const [cats, setCats] = useState<string[]>([]);
  const [maxHours, setMaxHours] = useState(4);
  const [maxSessions, setMaxSessions] = useState(10);
  const { classes: CLASSES, programs: PROGRAMS } = useSessions();
  const isClasses = tab === 'Classes';

  const toggleCat = (c: string) =>
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const filteredClasses = CLASSES.filter(
    (c) => (cats.length === 0 || cats.includes(c.category)) && c.durationHours <= maxHours
  );
  const filteredPrograms = PROGRAMS.filter(
    (p) => (cats.length === 0 || cats.includes(p.category)) && p.sessions <= maxSessions
  );

  const clearAll = () => {
    setCats([]);
    setMaxHours(4);
    setMaxSessions(10);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Text style={styles.kicker}>THE INTEND</Text>
          <Pressable style={styles.filterBtn} onPress={() => setFilterOpen(true)} hitSlop={10}>
            <Ionicons name="options-outline" size={20} color={COLORS.ink} />
          </Pressable>
        </View>

        <Text style={styles.h1}>Sessions</Text>
        <Text style={styles.sub}>Live classes and guided programs with your experts.</Text>

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

        {isClasses ? (
          filteredClasses.length > 0 ? (
            filteredClasses.map((c) => <ClassCard key={c.id} item={c} />)
          ) : (
            <View style={styles.noResult}>
              <Text style={styles.noResultText}>No classes match these filters yet.</Text>
            </View>
          )
        ) : filteredPrograms.length > 0 ? (
          filteredPrograms.map((p) => <ProgramCard key={p.id} item={p} />)
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
            <Text style={styles.sheetTitle}>Filter {isClasses ? 'classes' : 'programs'}</Text>

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

            {isClasses ? (
              <View>
                <Text style={styles.filterLabel}>Duration · up to {maxHours}h</Text>
                <Slider
                  minimumValue={1}
                  maximumValue={4}
                  step={0.5}
                  value={maxHours}
                  onValueChange={setMaxHours}
                  minimumTrackTintColor={COLORS.accent}
                  maximumTrackTintColor={COLORS.line}
                  thumbTintColor={COLORS.accent}
                />
              </View>
            ) : (
              <View>
                <Text style={styles.filterLabel}>Sessions · up to {maxSessions}</Text>
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

function ClassCard({ item }: { item: SessionClass }) {
  const router = useRouter();
  return (
    <Pressable style={styles.card} onPress={() => router.push(`/class/${item.id}`)}>
      <View style={[styles.cover, { backgroundColor: item.color }]}>
        <Text style={styles.coverTitle}>{item.title}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.metaRow}>
          <Text style={styles.pill}>{item.date}</Text>
          <Text style={styles.pill}>{item.durationHours}h</Text>
          <Text style={styles.pill}>{item.category}</Text>
        </View>
        <Text style={styles.expert}>{item.expertName}</Text>
        <Text style={styles.going}>{item.going} going · Virtual</Text>
      </View>
    </Pressable>
  );
}

function ProgramCard({ item }: { item: Program }) {
  const router = useRouter();
  return (
    <Pressable style={styles.card} onPress={() => router.push(`/program/${item.id}`)}>
      <View style={[styles.cover, { backgroundColor: item.color }]}>
        <Text style={styles.coverTitle}>{item.title}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.metaRow}>
          <Text style={styles.pill}>{item.weeks} weeks</Text>
          <Text style={styles.pill}>{item.sessions} sessions</Text>
          {item.category ? <Text style={styles.pill}>{item.category}</Text> : null}
        </View>
        <Text style={styles.expert}>{item.expertName}</Text>
        <Text style={styles.going}>{item.price}</Text>
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
  cardBody: { padding: 18 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pill: { fontSize: 12, color: COLORS.ink, backgroundColor: COLORS.accentSoft, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, overflow: 'hidden' },
  expert: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  going: { fontSize: 13, color: COLORS.muted, marginTop: 6 },
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
  applyBtn: { backgroundColor: COLORS.accent, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 999 },
  applyText: { color: COLORS.bg, fontSize: 15 },
});
