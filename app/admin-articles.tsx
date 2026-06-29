import { Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { useArticles } from '@/lib/articles';

export default function AdminArticles() {
  const router = useRouter();
  const { role } = useAuth();
  const { articles, loading, error } = useArticles();

  if (role !== 'admin') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackBar onPress={() => router.back()} />
        <View style={styles.center}><Text style={styles.muted}>Admins only.</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackBar onPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Edit articles</Text>
        <Text style={styles.sub}>Tap an article to fix its title, category or text. Edits show for everyone.</Text>
        {loading ? (
          <ActivityIndicator color={COLORS.accent} style={{ marginTop: 24 }} />
        ) : (
          <>
            {error ? <Text style={styles.err}>Couldn't load articles ({error}).</Text> : null}
            {articles.map((a) => (
              <Pressable key={a.id} style={styles.row} onPress={() => router.push(`/admin-article/${a.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cat}>{a.category.toUpperCase()}</Text>
                  <Text style={styles.title}>{a.title}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BackBar({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.backBar} onPress={onPress} hitSlop={10}>
      <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
      <Text style={styles.backText}>Admin</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 15, color: COLORS.muted },
  h1: { fontFamily: FONT_SERIF, fontSize: 32, color: COLORS.ink, marginBottom: 8 },
  sub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginBottom: 16 },
  err: { fontSize: 13, color: COLORS.muted, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 8 },
  cat: { fontSize: 11, letterSpacing: 1.5, color: COLORS.accent, marginBottom: 4 },
  title: { fontFamily: FONT_SERIF, fontSize: 16, lineHeight: 21, color: COLORS.ink },
});
