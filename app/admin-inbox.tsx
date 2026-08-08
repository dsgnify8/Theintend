import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { markFeedbackRead, useFeedback } from '@/lib/feedback';

const WASH = ['rgba(107,97,87,0.13)', 'rgba(107,97,87,0.04)', 'rgba(107,97,87,0)'];

function when(iso: string): string {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} hr ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function AdminInbox() {
  const router = useRouter();
  const { role } = useAuth();
  const { items, unread, loading, reload } = useFeedback();
  const [query, setQuery] = useState('');

  // Opening the inbox is reading it. Marked after a moment so the unread marks
  // are still visible when the screen appears.
  useEffect(() => {
    if (!items.length) return;
    const ids = items.filter((i) => !i.read_at).map((i) => i.id);
    if (!ids.length) return;
    const t = setTimeout(() => { markFeedbackRead(ids).then(reload).catch(() => {}); }, 2500);
    return () => clearTimeout(t);
  }, [items.length]);

  const term = query.trim().toLowerCase();
  const shown = term
    ? items.filter((i) =>
        [i.message, i.email, i.full_name].filter(Boolean).some((v: any) => String(v).toLowerCase().includes(term)))
    : items;

  if (role !== 'admin') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Back onPress={() => router.back()} />
        <Text style={styles.muted}>Admins only.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={WASH} style={styles.wash} pointerEvents="none" />
      <Back onPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Inbox</Text>
        <Text style={styles.sub}>
          {loading
            ? 'Loading'
            : `${items.length} message${items.length === 1 ? '' : 's'}${unread ? `, ${unread} new` : ''}`}
        </Text>

        {items.length > 4 ? (
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={17} color={COLORS.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search messages or people"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
              style={styles.searchInput}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10}>
                <Ionicons name="close-circle" size={17} color={COLORS.muted} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={COLORS.accent} style={{ marginTop: 24 }} />
        ) : shown.length === 0 ? (
          <Text style={styles.emptyText}>
            {term ? 'Nothing matches that.' : 'Nothing yet. Feedback from the companion arrives here.'}
          </Text>
        ) : (
          shown.map((f) => (
            <View key={f.id} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.who}>{f.full_name || f.email || 'Someone'}</Text>
                  {f.full_name && f.email ? <Text style={styles.email}>{f.email}</Text> : null}
                </View>
                {!f.read_at ? <View style={styles.dot} /> : null}
                <Text style={styles.when}>{when(f.created_at)}</Text>
              </View>
              <Text style={styles.message} selectable>{f.message}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Back({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.backBar} onPress={onPress} hitSlop={10}>
      <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
      <Text style={styles.backText}>Admin</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 56 },
  h1: { fontFamily: FONT_SERIF, fontSize: 30, color: COLORS.ink, marginBottom: 4 },
  sub: { fontSize: 14, color: COLORS.muted, marginBottom: 14 },
  muted: { fontSize: 15, color: COLORS.muted, padding: 24 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', paddingHorizontal: 16, paddingVertical: 11, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.ink, padding: 0 },
  emptyText: { fontSize: 14, lineHeight: 21, color: COLORS.muted, paddingVertical: 24, textAlign: 'center' },
  card: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  who: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  email: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.accent },
  when: { fontSize: 12, color: COLORS.muted },
  message: { fontSize: 15, lineHeight: 23, color: COLORS.ink },
});
