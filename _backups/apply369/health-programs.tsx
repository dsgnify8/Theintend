import { useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import {
  HEALTH_PROGRAMS, HEALTH_PROGRAM_AUTHOR, HEALTH_PROGRAM_PRICE_AED, type HealthProgram,
} from '@/constants/healthPrograms';

// Warm the whole way down rather than cold, so it reads as this app at night
// and not as a different one.
const FIELD = ['#241F1B', '#2E2721', '#3A322A', '#241F1B'];
// Catches the light along the top edge of a card.
const GLOSS = ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0)'];
// A slow warmth behind the heading.
const HALO = ['rgba(241,228,190,0.16)', 'rgba(241,228,190,0.04)', 'rgba(241,228,190,0)'];

export default function HealthPrograms() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <LinearGradient colors={FIELD} locations={[0, 0.35, 0.7, 1]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={HALO} style={styles.halo} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.85)" />
          <Text style={styles.backText}>Library</Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>THE INTEND</Text>
          <Text style={styles.h1}>Health{'\n'}Programs</Text>
          <Text style={styles.sub}>
            Structured protocols for the things that do not resolve on their own. Each one written
            by {HEALTH_PROGRAM_AUTHOR}, and built to be followed week by week.
          </Text>

          <View style={styles.rule} />
          <View style={styles.countRow}>
            <Text style={styles.countText}>{HEALTH_PROGRAMS.length} programs</Text>
            <Text style={styles.countText}>AED {HEALTH_PROGRAM_PRICE_AED} each</Text>
          </View>

          {HEALTH_PROGRAMS.map((p, i) => (
            <ProgramCard key={p.id} program={p} index={i} onPress={() => router.push(`/health-program/${p.id}`)} />
          ))}

          <Text style={styles.footNote}>
            These are wellness programs, not medical treatment. Speak with your doctor before
            starting one, especially if you take medication or manage a diagnosed condition.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ProgramCard({ program, index, onPress }: { program: HealthProgram; index: number; onPress: () => void }) {
  // A touch of weight on press, rather than a flash of colour.
  const press = useRef(new Animated.Value(0)).current;
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] });

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={styles.card}
        onPress={onPress}
        onPressIn={() => Animated.timing(press, { toValue: 1, duration: 110, useNativeDriver: true }).start()}
        onPressOut={() => Animated.timing(press, { toValue: 0, duration: 160, useNativeDriver: true }).start()}
      >
        <LinearGradient colors={GLOSS} style={styles.gloss} pointerEvents="none" />

        <View style={styles.cardHead}>
          <Text style={styles.num}>{String(index + 1).padStart(2, '0')}</Text>
          <Text style={styles.focus}>{program.focus.toUpperCase()}</Text>
        </View>

        <Text style={styles.title}>{program.title}</Text>
        <Text style={styles.blurb}>{program.blurb}</Text>

        <View style={styles.cardRule} />

        <View style={styles.cardFoot}>
          <View style={{ flex: 1 }}>
            <Text style={styles.by}>Program by {HEALTH_PROGRAM_AUTHOR}</Text>
            <Text style={styles.weeks}>{program.weeks}</Text>
          </View>
          <View style={styles.priceTag}>
            <Text style={styles.priceText}>AED {HEALTH_PROGRAM_PRICE_AED}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const HAIR = 'rgba(255,255,255,0.12)';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#241F1B' },
  safe: { flex: 1 },
  halo: { position: 'absolute', top: 0, left: 0, right: 0, height: 460 },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: 'rgba(255,255,255,0.85)', marginLeft: 2 },
  content: { paddingHorizontal: 22, paddingBottom: 64 },

  kicker: { fontSize: 10, letterSpacing: 3.2, color: 'rgba(255,255,255,0.5)', marginTop: 10, marginBottom: 14 },
  h1: { fontFamily: FONT_SERIF, fontSize: 46, lineHeight: 52, color: '#FFFFFF' },
  sub: { fontSize: 15, lineHeight: 23, color: 'rgba(255,255,255,0.66)', marginTop: 16 },

  rule: { height: 1, backgroundColor: HAIR, marginTop: 26 },
  countRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, marginBottom: 14 },
  countText: { fontSize: 11, letterSpacing: 1.8, color: 'rgba(255,255,255,0.45)' },

  // Glass: barely there over the gradient, held by a hairline.
  card: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: HAIR,
    overflow: 'hidden',
    padding: 22,
    marginBottom: 14,
  },
  gloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 90 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  num: { fontFamily: FONT_SERIF, fontSize: 13, color: COLORS.pastel, opacity: 0.8 },
  focus: { flex: 1, fontSize: 9.5, letterSpacing: 2.2, color: 'rgba(255,255,255,0.5)' },

  title: { fontFamily: FONT_SERIF, fontSize: 25, lineHeight: 31, color: '#FFFFFF' },
  blurb: { fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.62)', marginTop: 10 },

  cardRule: { height: 1, backgroundColor: HAIR, marginTop: 18, marginBottom: 14 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  by: { fontSize: 12, color: COLORS.pastel, opacity: 0.85 },
  weeks: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 3 },
  priceTag: { borderWidth: 1, borderColor: 'rgba(241,228,190,0.35)', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  priceText: { fontSize: 12, letterSpacing: 0.4, color: COLORS.pastel },

  footNote: { fontSize: 12, lineHeight: 19, color: 'rgba(255,255,255,0.4)', marginTop: 18, paddingHorizontal: 2 },
});
