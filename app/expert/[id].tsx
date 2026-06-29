import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useExpert } from '@/lib/experts';
import { useSessions } from '@/lib/sessions';
import { COLORS, FONT_SERIF } from '@/constants/brand';

export default function ExpertProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { expert, loading } = useExpert(id);
  const { classes: CLASSES, programs: PROGRAMS } = useSessions();

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

  const classes = CLASSES.filter((c) => c.expertId === expert.id);
  const programs = PROGRAMS.filter((p) => p.expertId === expert.id);
  const firstName = expert.name.replace('Dr. ', '').split(' ')[0];
  const initials = expert.name.replace('Dr. ', '').split(' ').map((p) => p[0]).slice(0, 2).join('');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackBar onPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <View style={styles.avatar}>
            {expert.photo ? (
              <Image source={{ uri: expert.photo }} style={styles.avatarImg} resizeMode="cover" />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <Text style={styles.name}>{expert.name}</Text>
          <Text style={styles.title}>{expert.title.toUpperCase()}</Text>
        </View>

        <Text style={styles.sectionTitle}>Approach</Text>
        <Text style={styles.body}>{expert.bio}</Text>

        <Text style={styles.sectionTitle}>What {firstName} offers</Text>
        <OfferingRow icon="person-outline" title="1:1 consultation" meta="Online or in person" onPress={() => router.push(`/book/${expert.id}`)} />
        {programs.map((p) => (
          <OfferingRow key={p.id} icon="ribbon-outline" title={p.title} meta={`${p.weeks} weeks · ${p.price}`} onPress={() => router.push(`/program/${p.id}`)} />
        ))}
        {classes.map((c) => (
          <OfferingRow key={c.id} icon="videocam-outline" title={c.title} meta={`${c.date} · ${c.durationHours}h live`} onPress={() => router.push(`/class/${c.id}`)} />
        ))}

        <Text style={styles.sectionTitle}>Questions I work with</Text>
        {expert.faqs.map((q, i) => (
          <View key={i} style={styles.qRow}>
            <Text style={styles.qText}>{'\u201C' + q + '\u201D'}</Text>
          </View>
        ))}

        <Pressable style={styles.bookBtn} onPress={() => router.push(`/book/${expert.id}`)}>
          <Text style={styles.bookText}>Book a consultation</Text>
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
        <Text style={styles.offerMeta}>{meta}</Text>
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
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  loaderBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  head: { alignItems: 'center', paddingVertical: 12 },
  avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 16 },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontFamily: FONT_SERIF, fontSize: 34, color: COLORS.accent },
  name: { fontFamily: FONT_SERIF, fontSize: 26, color: COLORS.ink, textAlign: 'center' },
  title: { fontSize: 11, letterSpacing: 1.5, color: COLORS.muted, textAlign: 'center', marginTop: 8 },
  sectionTitle: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginTop: 28, marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 24, color: COLORS.ink, opacity: 0.88 },
  offerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  offerIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  offerTitle: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  offerMeta: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  qRow: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  qText: { fontFamily: FONT_SERIF, fontStyle: 'italic', fontSize: 15, lineHeight: 22, color: COLORS.ink },
  bookBtn: { marginTop: 28, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.accent, alignItems: 'center' },
  bookText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  missing: { padding: 24, fontSize: 15, color: COLORS.muted },
});
