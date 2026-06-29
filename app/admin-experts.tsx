import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { ensureSeeded, useExperts } from '@/lib/experts';

export default function AdminExperts() {
  const router = useRouter();
  const { role } = useAuth();
  const { experts, loading } = useExperts();
  const [seeding, setSeeding] = useState(true);

  useEffect(() => {
    ensureSeeded().finally(() => setSeeding(false));
  }, []);

  if (role !== 'admin') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackBar onPress={() => router.back()} />
        <View style={styles.locked}>
          <Ionicons name="lock-closed-outline" size={28} color={COLORS.muted} />
          <Text style={styles.lockedText}>Admins only.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackBar onPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Edit experts</Text>
        <Text style={styles.sub}>Tap an expert to update their photo and bio. Changes go live everywhere.</Text>

        {loading || seeding ? (
          <ActivityIndicator color={COLORS.accent} style={{ marginTop: 24 }} />
        ) : (
          experts.map((e) => {
            const initials = e.name.replace('Dr. ', '').split(' ').map((p) => p[0]).slice(0, 2).join('');
            return (
              <Pressable key={e.id} style={styles.row} onPress={() => router.push(`/admin-expert/${e.id}`)}>
                <View style={styles.avatar}>
                  {e.photo ? (
                    <Image source={{ uri: e.photo }} style={styles.avatarImg} resizeMode="cover" />
                  ) : (
                    <Text style={styles.avatarText}>{initials}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{e.name}</Text>
                  <Text style={styles.title}>{e.title}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
              </Pressable>
            );
          })
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
  h1: { fontFamily: FONT_SERIF, fontSize: 32, color: COLORS.ink, marginBottom: 8 },
  sub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginBottom: 16 },
  locked: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 60 },
  lockedText: { fontSize: 15, color: COLORS.muted },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 14, marginBottom: 10 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginRight: 14 },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontFamily: FONT_SERIF, fontSize: 18, color: COLORS.accent },
  name: { fontFamily: FONT_SERIF, fontSize: 17, color: COLORS.ink },
  title: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
});
