import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONT_SERIF, USER } from '@/constants/brand';
import { ARTICLES } from '@/constants/articles';

const MOODS = [
  { key: 'calm', label: 'Calm', suggestion: 'Lovely. Keep the momentum with a short gratitude note in your journal.' },
  { key: 'stressed', label: 'Stressed', suggestion: 'Try a few minutes of breathwork. Omar and Irina both work with the nervous system.' },
  { key: 'anxious', label: 'Anxious', suggestion: 'Ground yourself first. A nervous system reset can ease the edge before anything else.' },
  { key: 'tired', label: 'Tired', suggestion: 'Be gentle today. A slow somatic practice may serve you more than pushing through.' },
  { key: 'inspired', label: 'Inspired', suggestion: 'Channel it. Explore the experts while the energy is here.' },
];

const RECOMMENDATIONS = [
  'Breathwork for stress',
  'Nervous system regulation',
  'Financial wellbeing',
  'Women\u2019s health',
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const [mood, setMood] = useState<string | null>(null);

  const suggestion = useMemo(
    () => MOODS.find((m) => m.key === mood)?.suggestion ?? null,
    [mood]
  );

  const latest = ARTICLES[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>THE INTEND</Text>
        <Text style={styles.greeting}>
          {greeting()}, {USER.name}.
        </Text>
        <Text style={styles.sub}>Continue your healing journey.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How are you feeling today?</Text>
          <View style={styles.moodRow}>
            {MOODS.map((m) => {
              const on = m.key === mood;
              return (
                <Pressable key={m.key} onPress={() => setMood(m.key)} style={[styles.mood, on && styles.moodOn]}>
                  <Text style={[styles.moodText, on && styles.moodTextOn]}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {suggestion ? <Text style={styles.suggestion}>{suggestion}</Text> : null}
        </View>

        <Text style={styles.section}>Today's recommendations</Text>
        <View style={styles.recWrap}>
          {RECOMMENDATIONS.map((r) => (
            <Pressable key={r} style={styles.rec} onPress={() => router.navigate('/experts')}>
              <Text style={styles.recText}>{r}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Latest article</Text>
        <Pressable style={styles.articleCard} onPress={() => router.navigate('/read')}>
          <Text style={styles.articleCat}>{latest.category.toUpperCase()}</Text>
          <Text style={styles.articleTitle}>{latest.title}</Text>
          <Text style={styles.articleMeta}>{latest.readMinutes} min read</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginBottom: 10 },
  greeting: { fontFamily: FONT_SERIF, fontSize: 34, lineHeight: 40, color: COLORS.ink },
  sub: { fontFamily: FONT_SERIF, fontStyle: 'italic', fontSize: 17, color: COLORS.muted, marginTop: 6, marginBottom: 22 },
  card: { backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, padding: 20, marginBottom: 26 },
  cardTitle: { fontFamily: FONT_SERIF, fontSize: 18, color: COLORS.ink, marginBottom: 14 },
  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mood: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line },
  moodOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  moodText: { fontSize: 13, color: COLORS.ink },
  moodTextOn: { color: COLORS.bg },
  suggestion: { marginTop: 14, fontSize: 14, lineHeight: 21, color: COLORS.ink, opacity: 0.85 },
  section: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginBottom: 14 },
  recWrap: { gap: 10, marginBottom: 28 },
  rec: { backgroundColor: COLORS.accentSoft, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 18 },
  recText: { fontSize: 15, color: COLORS.ink },
  articleCard: { backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, padding: 20 },
  articleCat: { fontSize: 11, letterSpacing: 1.5, color: COLORS.accent, marginBottom: 8 },
  articleTitle: { fontFamily: FONT_SERIF, fontSize: 19, lineHeight: 25, color: COLORS.ink, marginBottom: 8 },
  articleMeta: { fontSize: 13, color: COLORS.muted },
});
