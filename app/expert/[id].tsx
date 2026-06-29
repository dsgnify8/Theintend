import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { EXPERTS } from '@/constants/experts';
import { COLORS, FONT_SERIF } from '@/constants/brand';

export default function ExpertProfile() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const expert = EXPERTS.find((e) => e.id === id);

  if (!expert) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackBar />
        <Text style={styles.missing}>Expert not found.</Text>
      </SafeAreaView>
    );
  }

  const initials = expert.name
    .replace('Dr. ', '')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackBar />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{expert.name}</Text>
          <Text style={styles.title}>{expert.title.toUpperCase()}</Text>
        </View>

        <Text style={styles.sectionTitle}>Approach</Text>
        <Text style={styles.body}>{expert.bio}</Text>

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

  function BackBar() {
    return (
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Experts</Text>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  head: { alignItems: 'center', paddingVertical: 12 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarText: { fontFamily: FONT_SERIF, fontSize: 30, color: COLORS.accent },
  name: { fontFamily: FONT_SERIF, fontSize: 26, color: COLORS.ink, textAlign: 'center' },
  title: { fontSize: 11, letterSpacing: 1.5, color: COLORS.muted, textAlign: 'center', marginTop: 8 },
  sectionTitle: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginTop: 28, marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 24, color: COLORS.ink, opacity: 0.88 },
  qRow: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  qText: { fontFamily: FONT_SERIF, fontStyle: 'italic', fontSize: 15, lineHeight: 22, color: COLORS.ink },
  bookBtn: { marginTop: 28, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.accent, alignItems: 'center' },
  bookText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  missing: { padding: 24, fontSize: 15, color: COLORS.muted },
});
