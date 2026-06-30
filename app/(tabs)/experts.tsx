import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { type Expert } from '@/constants/experts';
import { useExperts } from '@/lib/experts';
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
          visible.map((e) => <HeroCard key={e.id} expert={e} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroCard({ expert }: { expert: Expert }) {
  const router = useRouter();
  return (
    <Pressable style={styles.hero} onPress={() => router.push(`/expert/${expert.id}`)}>
      <View style={styles.heroImageWrap}>
        {expert.photo ? (
          <Image source={{ uri: expert.photo }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={[styles.heroImage, styles.heroFallback]}>
            <Text style={styles.heroInitials}>{initials(expert.name)}</Text>
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(43,38,34,0.08)', 'rgba(43,38,34,0.86)']}
          style={styles.heroGradient}
        />
        <View style={styles.heroNameWrap}>
          <Text style={styles.heroCategory}>{expert.category.toUpperCase()}</Text>
          <Text style={styles.heroName}>{expert.name}</Text>
        </View>
      </View>
      <View style={styles.heroBody}>
        <Text style={styles.heroTitle}>{expert.title.toUpperCase()}</Text>
        <Text style={styles.heroBlurb}>{expert.blurb}</Text>
        <View style={styles.heroBtn}><Text style={styles.heroBtnText}>See profile</Text></View>
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
  hero: { backgroundColor: COLORS.card, borderRadius: 24, borderWidth: 1, borderColor: COLORS.line, overflow: 'hidden', marginTop: 18, marginBottom: 20 },
  heroImageWrap: { height: 300, width: '100%', position: 'relative', backgroundColor: COLORS.accentSoft },
  heroImage: { width: '100%', height: '100%' },
  heroFallback: { alignItems: 'center', justifyContent: 'center' },
  heroInitials: { fontFamily: FONT_SERIF, fontSize: 64, color: COLORS.accent },
  heroGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 180 },
  heroNameWrap: { position: 'absolute', left: 22, right: 22, bottom: 18 },
  heroCategory: { fontSize: 11, letterSpacing: 2, color: COLORS.bg, opacity: 0.9, marginBottom: 6 },
  heroName: { fontFamily: FONT_SERIF, fontSize: 32, lineHeight: 36, color: '#FFFFFF' },
  heroBody: { padding: 22 },
  heroTitle: { fontSize: 11, letterSpacing: 1.5, color: COLORS.muted, marginBottom: 10 },
  heroBlurb: { fontSize: 15, lineHeight: 23, color: COLORS.ink, opacity: 0.9 },
  heroBtn: { alignSelf: 'flex-start', marginTop: 18, paddingVertical: 11, paddingHorizontal: 24, borderRadius: 999, backgroundColor: COLORS.accent },
  heroBtnText: { fontSize: 14, letterSpacing: 0.5, color: COLORS.bg },
});
