import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { useAllProfiles } from '@/lib/admin';

const WASH = ['rgba(107,97,87,0.13)', 'rgba(107,97,87,0.04)', 'rgba(107,97,87,0)'];

export default function AdminPeople() {
  const router = useRouter();
  const { role } = useAuth();
  const { profiles, loading } = useAllProfiles();
  const [query, setQuery] = useState('');
  const [only, setOnly] = useState<'all' | 'staff'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = profiles as any[];
    if (only === 'staff') list = list.filter((p) => p.role && p.role !== 'user');
    if (!q) return list;
    return list.filter((p) =>
      [p.full_name, p.email].filter(Boolean).some((v: string) => v.toLowerCase().includes(q)),
    );
  }, [profiles, query, only]);

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
        <Text style={styles.h1}>Everyone</Text>
        <Text style={styles.sub}>
          {loading ? 'Loading' : `${profiles.length} account${profiles.length === 1 ? '' : 's'}`}
        </Text>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={17} color={COLORS.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Name or email"
            placeholderTextColor={COLORS.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={17} color={COLORS.muted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.tabRow}>
          {(['all', 'staff'] as const).map((t) => (
            <Pressable key={t} onPress={() => setOnly(t)} style={[styles.tab, only === t && styles.tabOn]}>
              <Text style={[styles.tabText, only === t && styles.tabTextOn]}>
                {t === 'all' ? 'Everyone' : 'Experts and admins'}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.accent} style={{ marginTop: 24 }} />
        ) : filtered.length === 0 ? (
          <Text style={styles.emptyText}>No one matches that.</Text>
        ) : (
          filtered.map((p: any) => (
            <View key={p.id} style={styles.personRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.personName}>{p.full_name || '(no name)'}</Text>
                <Text style={styles.personEmail}>{p.email}</Text>
              </View>
              <View style={[styles.badge, p.role !== 'user' && styles.badgeStrong]}>
                <Text style={[styles.badgeText, p.role !== 'user' && styles.badgeTextStrong]}>{p.role}</Text>
              </View>
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
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', paddingHorizontal: 16, paddingVertical: 11 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.ink, padding: 0 },
  tabRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 14 },
  tab: { paddingVertical: 9, paddingHorizontal: 15, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line },
  tabOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  tabText: { fontSize: 12, color: COLORS.ink },
  tabTextOn: { color: COLORS.bg },
  emptyText: { fontSize: 14, color: COLORS.muted, paddingVertical: 24, textAlign: 'center' },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 14, marginBottom: 8 },
  personName: { fontFamily: FONT_SERIF, fontSize: 15, color: COLORS.ink },
  personEmail: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  badge: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, backgroundColor: COLORS.accentSoft },
  badgeStrong: { backgroundColor: COLORS.ink },
  badgeText: { fontSize: 12, color: COLORS.ink },
  badgeTextStrong: { color: COLORS.bg },
});
