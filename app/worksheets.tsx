import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { WORKSHEETS } from '@/constants/worksheets';
import { useDraft, useWorksheetEntries } from '@/lib/worksheets';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}

export default function WorksheetsScreen() {
  const router = useRouter();
  const purpose = WORKSHEETS[0];
  const draft = useDraft(purpose.id);
  const { entries } = useWorksheetEntries(purpose.id);
  const inProgress = !!draft && Object.values(draft.answers).some((v) => (v ?? '').trim().length > 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Library</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>WORKBOOKS</Text>
        <Text style={styles.h1}>Guided workbooks</Text>
        <Text style={styles.lede}>Slow, structured pages to work through at your own pace. Everything you write is saved as you go.</Text>

        <Pressable style={styles.card} onPress={() => router.push(`/worksheet/${purpose.id}`)}>
          <View style={styles.cardTop}>
            <View style={styles.badge}><Ionicons name="compass-outline" size={20} color={COLORS.bg} /></View>
            {inProgress ? <View style={styles.pill}><Text style={styles.pillText}>In progress</Text></View> : null}
          </View>
          <Text style={styles.cardTitle}>{purpose.title}</Text>
          <Text style={styles.cardSub}>{purpose.subtitle}</Text>
          <Text style={styles.cardBlurb}>{purpose.blurb}</Text>
          <View style={styles.cardFoot}>
            <Text style={styles.cardMeta}>{purpose.minutes}</Text>
            <View style={styles.startBtn}><Text style={styles.startText}>{inProgress ? 'Resume' : 'Start'}</Text></View>
          </View>
        </Pressable>

        {entries.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Your saved copies</Text>
            {entries.map((e) => (
              <Pressable key={e.id} style={styles.copyRow} onPress={() => router.push(`/worksheet/${e.worksheetId}?entry=${e.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.copyTitle}>{purpose.title}</Text>
                  <Text style={styles.copyMeta}>Saved {fmtDate(e.createdAt)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
              </Pressable>
            ))}
          </>
        ) : null}

        <Text style={styles.footNote}>More workbooks are on the way.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 48 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginBottom: 10 },
  h1: { fontFamily: FONT_SERIF, fontSize: 28, lineHeight: 34, color: COLORS.ink },
  lede: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginTop: 10, marginBottom: 24 },
  card: { backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 22, borderWidth: 1, borderColor: COLORS.line, padding: 20 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  badge: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  pill: { backgroundColor: COLORS.accentSoft, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  pillText: { fontSize: 11, letterSpacing: 0.5, color: COLORS.accent },
  cardTitle: { fontFamily: FONT_SERIF, fontSize: 24, color: COLORS.ink },
  cardSub: { fontSize: 14, color: COLORS.accent, marginTop: 4 },
  cardBlurb: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginTop: 12 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  cardMeta: { fontSize: 13, color: COLORS.muted },
  startBtn: { backgroundColor: COLORS.accent, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 24 },
  startText: { color: COLORS.bg, fontSize: 14, letterSpacing: 0.5 },
  sectionLabel: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginTop: 30, marginBottom: 14 },
  copyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  copyTitle: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  copyMeta: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  footNote: { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 30 },
});
