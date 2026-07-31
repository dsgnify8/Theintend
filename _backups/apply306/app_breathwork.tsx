import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { BREATH_PROGRAMS, type BreathProgram } from '@/constants/breathwork';
import { COLORS, FONT_SERIF } from '@/constants/brand';

export default function BreathworkScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Library</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>THE INTEND</Text>
        <Text style={styles.h1}>Breathwork</Text>
        <Text style={styles.sub}>Short, guided breathing sessions to calm the body and steady the mind.</Text>
        <View style={styles.grid}>
          {BREATH_PROGRAMS.map((p) => (
            <ProgramCard key={p.id} program={p} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgramCard({ program }: { program: BreathProgram }) {
  const router = useRouter();
  return (
    <Pressable style={styles.cardWrap} onPress={() => router.push(`/breath/${program.id}`)}>
      <ImageBackground
        source={program.cover}
        style={[styles.card, { backgroundColor: program.color }]}
        imageStyle={styles.cardImg}
        resizeMode="cover"
      >
        <View style={styles.scrim} pointerEvents="none" />
        <View style={styles.leafChip}>
          <Ionicons name="leaf-outline" size={16} color={COLORS.ink} />
        </View>
        <View style={styles.durPill}>
          <Text style={styles.cardDuration}>{program.duration}</Text>
        </View>
      </ImageBackground>
      <Text style={styles.cardTitle}>{program.title}</Text>
      <Text style={styles.cardSub}>{program.subtitle}</Text>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8 },
  cardWrap: { width: '48%', marginBottom: 22 },
  card: { height: 130, borderRadius: 18, padding: 12, justifyContent: 'space-between', alignItems: 'flex-start', overflow: 'hidden' },
  cardImg: { borderRadius: 18 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 18, backgroundColor: 'rgba(43,38,34,0.28)' },
  leafChip: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  durPill: { backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  cardDuration: { fontSize: 12, color: COLORS.ink },
  cardTitle: { fontFamily: FONT_SERIF, fontSize: 17, color: COLORS.ink, marginTop: 10 },
  cardSub: { fontSize: 13, lineHeight: 18, color: COLORS.muted, marginTop: 4 },
});
