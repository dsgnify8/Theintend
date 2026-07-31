import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Dimensions, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { type Expert } from '@/constants/experts';
import { useExperts } from '@/lib/experts';
import { FramedImage } from '@/components/FramedImage';
import { COLORS, FONT_ITALIC, FONT_SERIF } from '@/constants/brand';

const ALL = 'All';
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Half the screen, bounded, so the first card always shows a sliver.
const HERO_H = Math.max(300, Math.min(440, Math.round(SCREEN_H * 0.5)));
const CARD_W = SCREEN_W - 40;
const CARD_H = Math.round(CARD_W * 1.12);

// Stepped opacities standing in for a gradient over the foot of each portrait.
const SCRIM = [0, 0.04, 0.1, 0.18, 0.28, 0.4, 0.52, 0.64];

function initials(name: string) {
  return name.replace('Dr. ', '').split(' ').map((p) => p[0]).slice(0, 2).join('');
}

export default function ExpertsScreen() {
  const [active, setActive] = useState<string>(ALL);
  const { experts, loading } = useExperts();
  const scrollY = useRef(new Animated.Value(0)).current;

  const categories = useMemo(
    () => [ALL, ...Array.from(new Set(experts.map((e) => e.category)))],
    [experts]
  );
  const visible = useMemo(
    () => (active === ALL ? experts : experts.filter((e) => e.category === active)),
    [active, experts]
  );

  const heroShift = scrollY.interpolate({
    inputRange: [0, HERO_H],
    outputRange: [0, -HERO_H * 0.32],
    extrapolate: 'clamp',
  });
  const heroFade = scrollY.interpolate({
    inputRange: [0, HERO_H * 0.62],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const barFade = scrollY.interpolate({
    inputRange: [HERO_H * 0.42, HERO_H * 0.72],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >
        <Animated.View style={[styles.hero, { opacity: heroFade, transform: [{ translateY: heroShift }] }]}>
          <Text style={styles.kicker}>THE INTEND</Text>
          <Text style={styles.h1}>Experts</Text>
          <View style={styles.heroRule} />
          <Text style={styles.sub}>Find your person.</Text>
          <Text style={styles.heroNote}>
            Every one of them works differently. Read them properly, then choose the one you
            recognise something in.
          </Text>
          <View style={styles.cue}>
            <View style={styles.cueLine} />
            <Text style={styles.cueText}>SCROLL</Text>
          </View>
        </Animated.View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {categories.map((c) => {
            const on = c === active;
            return (
              <Pressable key={c} onPress={() => setActive(c)} style={styles.filter} hitSlop={6}>
                <Text style={[styles.filterText, on && styles.filterTextOn]}>{c.toUpperCase()}</Text>
                <View style={[styles.filterRule, on && styles.filterRuleOn]} />
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.loader}><ActivityIndicator color={COLORS.accent} /></View>
        ) : visible.length === 0 ? (
          <Text style={styles.empty}>No one in this category yet.</Text>
        ) : (
          <View style={styles.list}>
            {visible.map((e, i) => (
              <ExpertCard key={e.id} expert={e} index={i} />
            ))}
          </View>
        )}
      </Animated.ScrollView>

      <Animated.View style={[styles.bar, { opacity: barFade }]} pointerEvents="none">
        <Text style={styles.barTitle}>Experts</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

function ExpertCard({ expert, index }: { expert: Expert; index: number }) {
  const router = useRouter();
  const right = index % 2 === 1;
  return (
    <View style={styles.slot}>
      <Pressable style={styles.card} onPress={() => router.push(`/expert/${expert.id}`)}>
        <View style={styles.photo}>
          {expert.photo ? (
            <FramedImage uri={expert.photo} scale={expert.photoScale ?? 1} x={expert.photoX ?? 0} y={expert.photoY ?? 0} radius={0} />
          ) : (
            <View style={styles.fallback}><Text style={styles.fallbackText}>{initials(expert.name)}</Text></View>
          )}
        </View>

        <View style={styles.scrim} pointerEvents="none">
          {SCRIM.map((o, i) => (
            <View key={i} style={[styles.scrimBand, { opacity: o }]} />
          ))}
        </View>

        <Text style={styles.numeral}>{String(index + 1).padStart(2, '0')}</Text>

        <View style={styles.tag}>
          <Text style={styles.tagText}>{expert.category.toUpperCase()}</Text>
        </View>

        <View style={[styles.overlay, right && styles.overlayRight]}>
          <Text style={[styles.name, right && styles.textRight]} numberOfLines={2}>{expert.name}</Text>
          <Text style={[styles.role, right && styles.textRight]} numberOfLines={2}>{expert.title.toUpperCase()}</Text>
        </View>
      </Pressable>

      <View style={[styles.foot, right && styles.footRight]}>
        <Text style={[styles.blurb, right && styles.textRight]} numberOfLines={3}>{expert.blurb}</Text>
        <Pressable onPress={() => router.push(`/expert/${expert.id}`)} hitSlop={8}>
          <Text style={[styles.link, right && styles.textRight]}>See profile {'\u203A'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 64 },

  hero: { height: HERO_H, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 11, letterSpacing: 4, color: COLORS.muted, marginBottom: 16 },
  h1: { fontFamily: FONT_SERIF, fontSize: 46, lineHeight: 54, color: COLORS.ink, textAlign: 'center' },
  heroRule: { width: 36, height: 1, backgroundColor: COLORS.accent, opacity: 0.5, marginTop: 18, marginBottom: 18 },
  sub: { fontFamily: FONT_ITALIC, fontSize: 19, color: COLORS.accent, textAlign: 'center' },
  heroNote: { fontSize: 14, lineHeight: 22, color: COLORS.muted, textAlign: 'center', marginTop: 14, paddingHorizontal: 24 },
  cue: { alignItems: 'center', marginTop: 30 },
  cueLine: { width: 1, height: 34, backgroundColor: COLORS.line },
  cueText: { fontSize: 9, letterSpacing: 3, color: COLORS.muted, marginTop: 8 },

  filters: { gap: 22, paddingTop: 6, paddingBottom: 10, paddingRight: 8 },
  filter: { alignItems: 'center' },
  filterText: { fontSize: 11, letterSpacing: 1.8, color: COLORS.muted },
  filterTextOn: { color: COLORS.ink },
  filterRule: { width: '100%', height: 1, backgroundColor: 'transparent', marginTop: 7 },
  filterRuleOn: { backgroundColor: COLORS.accent },

  loader: { paddingVertical: 60, alignItems: 'center' },
  empty: { fontSize: 14, color: COLORS.muted, paddingVertical: 40, textAlign: 'center' },

  list: { marginTop: 18 },
  slot: { marginBottom: 44 },
  card: {
    width: CARD_W, height: CARD_H, borderRadius: 26, overflow: 'hidden',
    backgroundColor: COLORS.accentSoft,
    shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 26, shadowOffset: { width: 0, height: 14 }, elevation: 8,
  },
  photo: { ...StyleSheet.absoluteFillObject },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fallbackText: { fontFamily: FONT_SERIF, fontSize: 66, color: COLORS.accent },

  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '58%' },
  scrimBand: { flex: 1, backgroundColor: COLORS.ink },

  numeral: { position: 'absolute', top: 18, right: 22, fontFamily: FONT_SERIF, fontSize: 40, color: COLORS.bg, opacity: 0.4 },
  tag: { position: 'absolute', top: 22, left: 20, backgroundColor: 'rgba(247,242,234,0.9)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 13 },
  tagText: { fontSize: 9, letterSpacing: 1.6, color: COLORS.ink },

  overlay: { position: 'absolute', left: 22, right: 22, bottom: 22 },
  overlayRight: { alignItems: 'flex-end' },
  textRight: { textAlign: 'right' },
  name: { fontFamily: FONT_SERIF, fontSize: 30, lineHeight: 36, color: COLORS.bg },
  role: { fontSize: 10, letterSpacing: 1.6, color: COLORS.bg, opacity: 0.82, marginTop: 8, lineHeight: 16 },

  foot: { marginTop: 18, paddingHorizontal: 4 },
  footRight: { alignItems: 'flex-end' },
  blurb: { fontSize: 14, lineHeight: 22, color: COLORS.ink, opacity: 0.82 },
  link: { fontSize: 13, letterSpacing: 0.3, color: COLORS.accent, marginTop: 12 },

  bar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: COLORS.bg, paddingBottom: 12, paddingTop: 4,
    borderBottomWidth: 1, borderBottomColor: COLORS.line, alignItems: 'center',
  },
  barTitle: { fontFamily: FONT_SERIF, fontSize: 17, color: COLORS.ink },
});
