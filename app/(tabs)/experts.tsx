import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { type Expert } from '@/constants/experts';
import { useExperts } from '@/lib/experts';
import { FramedImage } from '@/components/FramedImage';
import { COLORS, FONT_SERIF } from '@/constants/brand';

const ALL = 'All';
function initials(name: string) {
  return name.replace('Dr. ', '').split(' ').map((p) => p[0]).slice(0, 2).join('');
}

export default function ExpertsScreen() {
  const [active, setActive] = useState<string>(ALL);
  const { experts, loading } = useExperts();

  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(experts.map((e) => e.category)))],
    [experts]
  );
  const visible = useMemo(
    () => (active === ALL ? experts : experts.filter((e) => e.category === active)),
    [active, experts]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>THE INTEND</Text>
        <Text style={styles.h1}>Connect With Experts</Text>
        <Text style={styles.sub}>Find your person.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {categories.map((c) => {
            const on = c === active;
            return (
              <Pressable key={c} onPress={() => setActive(c)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.loader}><ActivityIndicator color={COLORS.accent} /></View>
        ) : (
          <View style={styles.list}>
            {visible.map((e, i) => (
              <ExpertCard key={e.id} expert={e} reverse={i % 2 === 1} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ExpertCard({ expert, reverse }: { expert: Expert; reverse: boolean }) {
  const router = useRouter();
  return (
    <Pressable
      style={[styles.card, reverse && styles.cardReverse]}
      onPress={() => router.push(`/expert/${expert.id}`)}
    >
      <View style={styles.photoWrap}>
        {expert.photo ? (
          <FramedImage uri={expert.photo} scale={expert.photoScale ?? 1} x={expert.photoX ?? 0} y={expert.photoY ?? 0} radius={18} />
        ) : (
          <View style={styles.photoFallback}><Text style={styles.photoInitials}>{initials(expert.name)}</Text></View>
        )}
      </View>
      <View style={[styles.body, reverse && styles.bodyReverse]}>
        <Text style={styles.cat}>{expert.category.toUpperCase()}</Text>
        <Text style={styles.name}>{expert.name}</Text>
        <Text style={styles.role}>{expert.title.toUpperCase()}</Text>
        <Text style={styles.blurb} numberOfLines={3}>{expert.blurb}</Text>
        <Text style={styles.link}>See profile {'\u203A'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginBottom: 10 },
  h1: { fontFamily: FONT_SERIF, fontSize: 34, lineHeight: 40, color: COLORS.ink },
  sub: { fontFamily: FONT_SERIF, fontStyle: 'italic', fontSize: 17, color: COLORS.muted, marginTop: 6, marginBottom: 18 },
  chips: { gap: 8, paddingVertical: 4, paddingRight: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line },
  chipOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  chipText: { fontSize: 13, color: COLORS.ink },
  chipTextOn: { color: COLORS.bg },
  loader: { paddingVertical: 60, alignItems: 'center' },

  list: { marginTop: 18, gap: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
  },
  cardReverse: { flexDirection: 'row-reverse' },
  photoWrap: { width: 116, height: 142, borderRadius: 18, overflow: 'hidden', backgroundColor: COLORS.accentSoft },
  photoFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  photoInitials: { fontFamily: FONT_SERIF, fontSize: 38, color: COLORS.accent },
  body: { flex: 1, paddingLeft: 16, paddingRight: 4 },
  bodyReverse: { paddingLeft: 4, paddingRight: 16 },
  cat: { fontSize: 10, letterSpacing: 1.5, color: COLORS.muted, marginBottom: 5 },
  name: { fontFamily: FONT_SERIF, fontSize: 21, lineHeight: 25, color: COLORS.ink },
  role: { fontSize: 10, letterSpacing: 1, color: COLORS.muted, marginTop: 4, marginBottom: 7 },
  blurb: { fontSize: 13, lineHeight: 19, color: COLORS.ink, opacity: 0.8 },
  link: { fontSize: 13, color: COLORS.accent, marginTop: 10 },
});
