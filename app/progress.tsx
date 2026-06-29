import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { ACHIEVEMENTS } from '@/constants/achievements';

const TABS = ['Overview', 'Achievements'];
const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const STREAK = 4;

export default function ProgressScreen() {
  const router = useRouter();
  const [tab, setTab] = useState('Overview');

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
                <View style={styles.streakBadge}>
                  <Text style={styles.streakNum}>{STREAK}</Text>
                </View>
                <Text style={styles.streakLabel}>DAY STREAK</Text>
              </View>
              <View style={styles.weekRow}>
                {WEEK.map((d, i) => {
                  const on = i < STREAK;
                  return (
                    <View key={i} style={[styles.dot, on && styles.dotOn]}>
                      <Text style={[styles.dotText, on && styles.dotTextOn]}>{d}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.statGrid}>
              <Stat icon="book-outline" value="12" label="Articles read" />
              <Stat icon="time-outline" value="240m" label="Listened" />
              <Stat icon="calendar-outline" value="3" label="Sessions joined" />
              <Stat icon="ribbon-outline" value="1" label="Programs" />
            </View>
            <Text style={styles.note}>Sample numbers for now. Your real progress fills in once tracking is connected.</Text>
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
    </SafeAreaView>
  );
}

function Stat({ icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={20} color={COLORS.accent} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
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
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dot: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  dotText: { fontSize: 13, color: COLORS.muted },
  dotTextOn: { color: COLORS.bg },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '48%', backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 18, marginBottom: 12, alignItems: 'center' },
  statValue: { fontFamily: FONT_SERIF, fontSize: 24, color: COLORS.ink, marginTop: 8 },
  statLabel: { fontSize: 12, color: COLORS.muted, marginTop: 6, textAlign: 'center' },
  note: { fontSize: 12, color: COLORS.muted, marginTop: 6 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  badge: { width: '48%', backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 20, marginBottom: 14, alignItems: 'center' },
  badgeCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  badgeLocked: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.line },
  badgeTitle: { fontFamily: FONT_SERIF, fontSize: 15, color: COLORS.ink, textAlign: 'center' },
  badgeState: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
});
