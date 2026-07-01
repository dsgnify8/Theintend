import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { MORNING, NIGHT, THEMES, CHALLENGE_TITLE, CHALLENGE_PROMPTS } from '@/constants/journal';
import { useEntryCounts, useChallenge } from '@/lib/journal';

export default function JournalHub() {
  const router = useRouter();
  const counts = useEntryCounts();
  const { data: challenge } = useChallenge();
  const challengeDone = Object.values(challenge).filter((d) => (d?.text ?? '').trim().length > 0).length;
  const daily = [MORNING, NIGHT];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Library</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>YOUR JOURNAL</Text>
        <Text style={styles.h1}>A quiet page for your thoughts</Text>
        <Text style={styles.lede}>Write freely. Everything you write is saved as you go, and each page you keep is dated so you can return to it.</Text>

        <View style={styles.dailyRow}>
          {daily.map((c) => (
            <Pressable key={c.id} style={styles.dailyCard} onPress={() => router.push(`/journaling/${c.id}`)}>
              <Ionicons name={c.id === 'morning' ? 'sunny-outline' : 'moon-outline'} size={22} color={COLORS.accent} />
              <Text style={styles.dailyTitle}>{c.id === 'morning' ? 'Morning' : 'Night'}</Text>
              <Text style={styles.dailyMeta}>{c.prompts.length} prompts</Text>
              {counts[c.id] ? <Text style={styles.dailyCount}>{counts[c.id]} saved</Text> : null}
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Explore by theme</Text>
        {THEMES.map((c) => (
          <Pressable key={c.id} style={styles.themeCard} onPress={() => router.push(`/journaling/${c.id}`)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.themeTitle}>{c.title}</Text>
              <Text style={styles.themeSub}>{c.subtitle}</Text>
              <Text style={styles.themeMeta}>{c.prompts.length} prompts</Text>
              {counts[c.id] ? <Text style={styles.themeCount}>{counts[c.id]} saved entries</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
          </Pressable>
        ))}

        <Text style={styles.sectionLabel}>A deeper practice</Text>
        <Pressable style={styles.challengeCard} onPress={() => router.push('/journaling/challenge')}>
          <Text style={styles.challengeKicker}>30 DAY PRACTICE</Text>
          <Text style={styles.challengeTitle}>{CHALLENGE_TITLE}</Text>
          <Text style={styles.challengeSub}>One prompt a day for thirty days. Turn the page each day and look back on everything you have written.</Text>
          <View style={styles.challengeFoot}>
            <Text style={styles.challengeProgress}>{challengeDone} of {CHALLENGE_PROMPTS.length} days written</Text>
            <View style={styles.challengeBtn}><Text style={styles.challengeBtnText}>Open</Text></View>
          </View>
        </Pressable>
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
  lede: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginTop: 10, marginBottom: 22 },
  dailyRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  dailyCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 16 },
  dailyTitle: { fontFamily: FONT_SERIF, fontSize: 18, color: COLORS.ink, marginTop: 12 },
  dailyMeta: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  dailyCount: { fontSize: 12, color: COLORS.accent, marginTop: 4 },
  sectionLabel: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginBottom: 14 },
  themeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 18, marginBottom: 12 },
  themeTitle: { fontFamily: FONT_SERIF, fontSize: 19, color: COLORS.ink },
  themeSub: { fontSize: 13, lineHeight: 19, color: COLORS.muted, marginTop: 4 },
  themeMeta: { fontSize: 12, letterSpacing: 0.5, color: COLORS.muted, marginTop: 8 },
  themeCount: { fontSize: 12, color: COLORS.accent, marginTop: 3 },
  challengeCard: { backgroundColor: COLORS.accent, borderRadius: 22, padding: 22, marginBottom: 8 },
  challengeKicker: { fontSize: 11, letterSpacing: 2, color: COLORS.bg, opacity: 0.8 },
  challengeTitle: { fontFamily: FONT_SERIF, fontSize: 24, color: COLORS.bg, marginTop: 8 },
  challengeSub: { fontSize: 13, lineHeight: 20, color: COLORS.bg, opacity: 0.9, marginTop: 8 },
  challengeFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  challengeProgress: { fontSize: 13, color: COLORS.bg, opacity: 0.9 },
  challengeBtn: { backgroundColor: COLORS.bg, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 22 },
  challengeBtnText: { fontSize: 14, color: COLORS.accent, letterSpacing: 0.5 },
});
