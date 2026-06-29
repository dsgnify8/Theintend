import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { SOUNDS, SOUND_CATEGORIES, type Sound } from '@/constants/sounds';
import { COLORS, FONT_SERIF } from '@/constants/brand';

export default function SoundsScreen() {
  const router = useRouter();
  const [active, setActive] = useState('All');

  const visible = useMemo(
    () => (active === 'All' ? SOUNDS : SOUNDS.filter((s) => s.category === active)),
    [active]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Home</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>THE INTEND</Text>
        <Text style={styles.h1}>Sounds & Frequencies</Text>
        <Text style={styles.sub}>Harmonic soundscapes for focus, calm, sleep and energy.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {SOUND_CATEGORIES.map((c) => {
            const on = c === active;
            return (
              <Pressable key={c} onPress={() => setActive(c)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.grid}>
          {visible.map((s) => (
            <SoundCard key={s.id} sound={s} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SoundCard({ sound }: { sound: Sound }) {
  const router = useRouter();
  return (
    <Pressable style={styles.cardWrap} onPress={() => router.push(`/sound/${sound.id}`)}>
      <View style={[styles.card, { backgroundColor: sound.color }]}>
        <Ionicons name="musical-notes-outline" size={20} color="rgba(255,255,255,0.85)" />
      </View>
      <Text style={styles.cardTitle}>{sound.title}</Text>
      <Text style={styles.cardPurpose}>{sound.purpose}</Text>
      <Text style={styles.cardDuration}>{sound.duration}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginBottom: 10 },
  h1: { fontFamily: FONT_SERIF, fontSize: 32, lineHeight: 38, color: COLORS.ink },
  sub: { fontSize: 15, lineHeight: 22, color: COLORS.muted, marginTop: 8, marginBottom: 18 },
  chips: { gap: 8, paddingVertical: 4, paddingRight: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line },
  chipOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  chipText: { fontSize: 13, color: COLORS.ink },
  chipTextOn: { color: COLORS.bg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 16 },
  cardWrap: { width: '48%', marginBottom: 22 },
  card: { height: 130, borderRadius: 18, padding: 14, justifyContent: 'flex-start' },
  cardTitle: { fontFamily: FONT_SERIF, fontSize: 17, color: COLORS.ink, marginTop: 10 },
  cardPurpose: { fontSize: 13, lineHeight: 18, color: COLORS.muted, marginTop: 4 },
  cardDuration: { fontSize: 12, color: COLORS.muted, marginTop: 6 },
});
