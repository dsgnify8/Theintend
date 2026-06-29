import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { type Expert } from '@/constants/experts';
import { useExperts } from '@/lib/experts';
import { COLORS, FONT_SERIF } from '@/constants/brand';

const ALL = 'All';

export default function ExpertsScreen() {
  const router = useRouter();
  const [active, setActive] = useState<string>(ALL);
  const { experts, loading } = useExperts();

  const categories = useMemo(() => {
    const unique = Array.from(new Set(experts.map((e) => e.category)));
    return [ALL, ...unique];
  }, [experts]);

  const visible = useMemo(
    () => (active === ALL ? experts : experts.filter((e) => e.category === active)),
    [active, experts]
  );

  const questions = useMemo(
    () => experts.flatMap((e) => e.faqs.slice(0, 1).map((q) => ({ q, name: e.name, id: e.id }))),
    [experts]
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
          <View style={styles.loader}>
            <ActivityIndicator color={COLORS.accent} />
          </View>
        ) : (
          <>
            {visible.map((e) => (
              <ExpertCard key={e.id} expert={e} />
            ))}

            <Text style={styles.section}>Questions people bring</Text>
            <Text style={styles.sectionSub}>Tap a question to meet the expert who works with it.</Text>
            {questions.map((item, i) => (
              <Pressable key={i} style={styles.qRow} onPress={() => router.push(`/expert/${item.id}`)}>
                <Text style={styles.qText}>{'\u201C' + item.q + '\u201D'}</Text>
                <Text style={styles.qName}>{item.name}</Text>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ExpertCard({ expert }: { expert: Expert }) {
  const router = useRouter();
  const initials = expert.name.replace('Dr. ', '').split(' ').map((p) => p[0]).slice(0, 2).join('');

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/expert/${expert.id}`)}>
      <View style={styles.avatar}>
        {expert.photo ? (
          <Image source={{ uri: expert.photo }} style={styles.avatarImg} resizeMode="cover" />
        ) : (
          <Text style={styles.avatarText}>{initials}</Text>
        )}
      </View>
      <Text style={styles.name}>{expert.name}</Text>
      <Text style={styles.title}>{expert.title.toUpperCase()}</Text>
      <Text style={styles.blurb}>{expert.blurb}</Text>
      <View style={styles.profileBtn}>
        <Text style={styles.profileBtnText}>See Profile</Text>
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
  card: { backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 28, paddingHorizontal: 22, marginTop: 16, alignItems: 'center' },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 16 },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontFamily: FONT_SERIF, fontSize: 28, color: COLORS.accent },
  name: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, textAlign: 'center' },
  title: { fontSize: 11, letterSpacing: 1.5, color: COLORS.muted, textAlign: 'center', marginTop: 8, marginBottom: 14 },
  blurb: { fontSize: 15, lineHeight: 23, color: COLORS.ink, textAlign: 'center', opacity: 0.85 },
  profileBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 999, borderWidth: 1, borderColor: COLORS.ink },
  profileBtnText: { fontSize: 14, letterSpacing: 0.5, color: COLORS.ink },
  section: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginTop: 34, marginBottom: 6 },
  sectionSub: { fontSize: 14, color: COLORS.muted, marginBottom: 14 },
  qRow: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  qText: { fontFamily: FONT_SERIF, fontStyle: 'italic', fontSize: 15, lineHeight: 22, color: COLORS.ink },
  qName: { fontSize: 12, letterSpacing: 1, color: COLORS.accent, marginTop: 8, textTransform: 'uppercase' },
});
