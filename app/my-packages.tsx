import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useMyPackages, type DBPackage } from '@/lib/packages';
import { COLORS, FONT_SERIF } from '@/constants/brand';

export default function MyPackagesScreen() {
  const router = useRouter();
  const { items, loading } = useMyPackages();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>YOUR PACKAGES</Text>
        <Text style={styles.h1}>Sessions to book</Text>

        {loading ? (
          <View style={styles.loaderBox}><ActivityIndicator color={COLORS.accent} /></View>
        ) : items.length === 0 ? (
          <Text style={styles.empty}>No packages yet. When you buy a session package it shows up here so you can book each session.</Text>
        ) : (
          items.map((p) => <PackageCard key={p.id} pkg={p} onBook={() => router.push(`/book/${p.expert_id}?service=${p.service_id}&pkg=${p.id}`)} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PackageCard({ pkg, onBook }: { pkg: DBPackage; onBook: () => void }) {
  const remaining = Math.max(pkg.total - pkg.used, 0);
  const done = remaining === 0;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{pkg.title}</Text>
      {pkg.expert_name ? <Text style={styles.cardExpert}>{pkg.expert_name.toUpperCase()}</Text> : null}

      <View style={styles.dots}>
        {Array.from({ length: pkg.total }).map((_, i) => (
          <View key={i} style={[styles.dot, i < pkg.used ? styles.dotUsed : styles.dotOpen]} />
        ))}
      </View>
      <Text style={styles.count}>{remaining} of {pkg.total} sessions remaining</Text>

      {done ? (
        <View style={styles.doneTag}><Text style={styles.doneTagText}>All sessions booked</Text></View>
      ) : (
        <Pressable style={styles.bookBtn} onPress={onBook}>
          <Text style={styles.bookText}>Book next session</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginTop: 6, marginBottom: 10 },
  h1: { fontFamily: FONT_SERIF, fontSize: 28, color: COLORS.ink, marginBottom: 20 },
  loaderBox: { paddingVertical: 40, alignItems: 'center' },
  empty: { fontSize: 15, lineHeight: 23, color: COLORS.muted, marginTop: 8 },
  card: { backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, padding: 20, marginBottom: 14 },
  cardTitle: { fontFamily: FONT_SERIF, fontSize: 19, color: COLORS.ink },
  cardExpert: { fontSize: 11, letterSpacing: 1.5, color: COLORS.muted, marginTop: 6 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 18 },
  dot: { flex: 1, height: 8, borderRadius: 4 },
  dotUsed: { backgroundColor: COLORS.line },
  dotOpen: { backgroundColor: COLORS.accent },
  count: { fontSize: 14, color: COLORS.ink, marginTop: 12 },
  bookBtn: { marginTop: 18, paddingVertical: 14, borderRadius: 999, backgroundColor: COLORS.taupeBlue, alignItems: 'center' },
  bookText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  doneTag: { marginTop: 18, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center' },
  doneTagText: { color: COLORS.muted, fontSize: 14 },
});
