import { useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useExpert } from '@/lib/experts';
import { FramedImage } from '@/components/FramedImage';
import { useSessions } from '@/lib/sessions';
import { useServices } from '@/lib/services';
import { COLORS, FONT_SERIF } from '@/constants/brand';

export default function ExpertProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const flip = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);
  const doFlip = () => {
    Animated.spring(flip, { toValue: flipped ? 0 : 1, useNativeDriver: true, friction: 8, tension: 12 }).start();
    setFlipped((v) => !v);
  };
  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const { expert, loading } = useExpert(id);
  const { classes: CLASSES, programs: PROGRAMS } = useSessions();
  const { services: ALL_SERVICES } = useServices();

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackBar onPress={() => router.back()} />
        <View style={styles.loaderBox}><ActivityIndicator color={COLORS.accent} /></View>
      </SafeAreaView>
    );
  }

  if (!expert) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackBar onPress={() => router.back()} />
        <Text style={styles.missing}>Expert not found.</Text>
      </SafeAreaView>
    );
  }

  const services = ALL_SERVICES.filter((s) => s.expertId === expert.id);
  const classes = CLASSES.filter((c) => c.expertId === expert.id);
  const programs = PROGRAMS.filter((p) => p.expertId === expert.id);
  const firstName = expert.name.replace('Dr. ', '').split(' ')[0];
  const initials = expert.name.replace('Dr. ', '').split(' ').map((p) => p[0]).slice(0, 2).join('');

  // "Where I can help" keywords come from the expert's focus areas + category.
  const helpTags = Array.from(
    new Set([...expert.title.split('·').map((t) => t.trim()), expert.category].filter(Boolean))
  );

  const svcMeta = (s: { durationMin: number | null; price: string }) => {
    const parts: string[] = [];
    if (s.durationMin) parts.push(`${s.durationMin} min`);
    if (s.price) parts.push(s.price);
    return parts.join(' · ');
  };

  const onShare = () => {
    Share.share({
      message: `${expert.name} — ${expert.title} on The Intend. ${expert.profileUrl}`,
      url: expert.profileUrl,
    }).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
          <Text style={styles.backText}>Experts</Text>
        </Pressable>
        <Pressable style={styles.shareBtn} onPress={onShare} hitSlop={10}>
          <Ionicons name="share-outline" size={20} color={COLORS.ink} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={doFlip} style={styles.flipWrap}>
          <Animated.View style={[styles.flipFace, styles.flipFront, { transform: [{ perspective: 1000 }, { rotateY: frontRotate }] }]}>
            <View style={styles.avatar}>
              {expert.photo ? (
                <FramedImage uri={expert.photo} scale={expert.photoScale ?? 1} x={expert.photoX ?? 0} y={expert.photoY ?? 0} radius={50} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <Text style={styles.name}>{expert.name}</Text>
            <Text style={styles.title}>{expert.title.toUpperCase()}</Text>
          </Animated.View>
          <Animated.View style={[styles.flipFace, styles.flipBack, { transform: [{ perspective: 1000 }, { rotateY: backRotate }] }]}>
            <View style={styles.verifyBadge}>
              <Ionicons name="shield-checkmark" size={28} color={COLORS.bg} />
            </View>
            <Text style={styles.verifyTitle}>All our experts are verified</Text>
            <Text style={styles.verifyText}>Every expert on The Intend has been identity verified, personally worked with, and tested before joining the platform.</Text>
          </Animated.View>
        </Pressable>

        {helpTags.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Where I can help</Text>
            <View style={styles.tagsRow}>
              {helpTags.map((t) => (
                <View key={t} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Approach</Text>
        <Text style={styles.body}>{expert.bio}</Text>

        {programs.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Programs</Text>
            {programs.map((p) => (
              <OfferingRow key={p.id} icon="ribbon-outline" title={p.title} meta={`${p.weeks} weeks · ${p.price}`} onPress={() => router.push(`/program/${p.id}`)} />
            ))}
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Sessions</Text>
        {services.length > 0 ? (
          services.map((s) => (
            <OfferingRow key={s.id} icon="person-outline" title={s.name} meta={svcMeta(s)} onPress={() => router.push(`/book/${expert.id}`)} />
          ))
        ) : (
          <OfferingRow icon="person-outline" title="1:1 consultation" meta="Online or in person" onPress={() => router.push(`/book/${expert.id}`)} />
        )}
        {classes.map((c) => (
          <OfferingRow key={c.id} icon="videocam-outline" title={c.title} meta={`${c.date} · ${c.durationHours}h live`} onPress={() => router.push(`/class/${c.id}`)} />
        ))}

        <Text style={styles.sectionTitle}>Client Questions</Text>
        {expert.faqs.map((q, i) => (
          <View key={i} style={styles.cqCard}>
            <Text style={styles.cqMark}>{'\u201C'}</Text>
            <Text style={styles.cqText}>{q}</Text>
          </View>
        ))}

        <Pressable style={styles.bookBtn} onPress={() => router.push(`/book/${expert.id}`)}>
          <Text style={styles.bookText}>Book with {firstName}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function OfferingRow({ icon, title, meta, onPress }: { icon: any; title: string; meta: string; onPress: () => void }) {
  return (
    <Pressable style={styles.offerRow} onPress={onPress}>
      <View style={styles.offerIcon}>
        <Ionicons name={icon} size={18} color={COLORS.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.offerTitle}>{title}</Text>
        {meta ? <Text style={styles.offerMeta}>{meta}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
    </Pressable>
  );
}

function BackBar({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.backBar} onPress={onPress} hitSlop={10}>
      <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
      <Text style={styles.backText}>Experts</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 14 },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  shareBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  loaderBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  head: { alignItems: 'center', paddingVertical: 12 },
  flipWrap: { height: 268, marginTop: 8, marginBottom: 4 },
  flipFace: { position: 'absolute', width: '100%', height: '100%', borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backfaceVisibility: 'hidden' },
  flipFront: { backgroundColor: 'rgba(255,255,255,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)' },
  flipBack: { backgroundColor: COLORS.accent },
  tapHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
  tapHintText: { fontSize: 10, letterSpacing: 1, color: COLORS.accent },
  verifyBadge: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  verifyTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.bg, textAlign: 'center', marginBottom: 10 },
  verifyText: { fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.92)', textAlign: 'center' },
  verifyTapBack: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 14 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 14 },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontFamily: FONT_SERIF, fontSize: 34, color: COLORS.accent },
  name: { fontFamily: FONT_SERIF, fontSize: 26, color: COLORS.ink, textAlign: 'center' },
  title: { fontSize: 11, letterSpacing: 1.5, color: COLORS.muted, textAlign: 'center', marginTop: 8 },
  sectionTitle: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginTop: 28, marginBottom: 12 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line },
  tagText: { fontSize: 13, color: COLORS.ink },
  body: { fontSize: 15, lineHeight: 24, color: COLORS.ink, opacity: 0.88 },
  offerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  offerIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  offerTitle: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  offerMeta: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  cqCard: { backgroundColor: COLORS.card, borderRadius: 16, borderLeftWidth: 3, borderLeftColor: COLORS.accent, borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: COLORS.line, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 6, marginBottom: 10 },
  cqMark: { fontFamily: FONT_SERIF, fontSize: 36, lineHeight: 40, color: COLORS.accent },
  cqText: { fontSize: 15, lineHeight: 23, color: COLORS.ink, marginTop: -8 },
  bookBtn: { marginTop: 28, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.accent, alignItems: 'center' },
  bookText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  missing: { padding: 24, fontSize: 15, color: COLORS.muted },
});

