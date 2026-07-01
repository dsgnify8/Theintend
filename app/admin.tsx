import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { setUserRole, useAllProfiles } from '@/lib/admin';

const ROLES = ['user', 'expert', 'admin'];

export default function Admin() {
  const router = useRouter();
  const { role } = useAuth();
  const { profiles, loading, reload } = useAllProfiles();
  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState('expert');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (role !== 'admin') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackBar onPress={() => router.back()} />
        <View style={styles.locked}>
          <Ionicons name="lock-closed-outline" size={28} color={COLORS.muted} />
          <Text style={styles.lockedText}>This area is for admins only.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const apply = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setStatus(null);
    const res = await setUserRole(email.trim(), newRole);
    const msg =
      res === 'ok' ? `Done. ${email.trim()} is now ${newRole}.` :
      res === 'no_account' ? 'No account with that email yet. They need to sign up first, then assign.' :
      res === 'not_authorized' ? 'Not authorized.' :
      res === 'bad_role' ? 'That role is not valid.' :
      res;
    setStatus(msg);
    setBusy(false);
    reload();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackBar onPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Admin</Text>

        <Text style={styles.sectionTitle}>Assign a role</Text>
        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="person@email.com"
          placeholderTextColor={COLORS.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Role</Text>
        <View style={styles.roleRow}>
          {ROLES.map((r) => {
            const on = r === newRole;
            return (
              <Pressable key={r} onPress={() => setNewRole(r)} style={[styles.roleChip, on && styles.roleChipOn]}>
                <Text style={[styles.roleChipText, on && styles.roleChipTextOn]}>{r}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable style={styles.applyBtn} onPress={apply} disabled={busy}>
          {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.applyText}>Apply role</Text>}
        </Pressable>
        {status ? <Text style={styles.status}>{status}</Text> : null}

        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>People</Text>
        {loading ? (
          <ActivityIndicator color={COLORS.accent} style={{ marginTop: 16 }} />
        ) : (
          profiles.map((p) => (
            <Pressable key={p.id} style={styles.personRow} onPress={() => setEmail(p.email || '')}>
              <View style={{ flex: 1 }}>
                <Text style={styles.personName}>{p.full_name || '(no name)'}</Text>
                <Text style={styles.personEmail}>{p.email}</Text>
              </View>
              <View style={[styles.badge, p.role !== 'user' && styles.badgeStrong]}>
                <Text style={[styles.badgeText, p.role !== 'user' && styles.badgeTextStrong]}>{p.role}</Text>
              </View>
            </Pressable>
          ))
        )}

        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Review</Text>
        <Pressable style={styles.soonCard} onPress={() => router.push('/admin-approvals')}>
          <Ionicons name="checkmark-done-outline" size={20} color={COLORS.accent} />
          <Text style={[styles.soonText, { color: COLORS.ink }]}>Approvals queue</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </Pressable>

        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Content</Text>
        <Pressable style={styles.soonCard} onPress={() => router.push('/admin-articles')}>
          <Ionicons name="document-text-outline" size={20} color={COLORS.accent} />
          <Text style={[styles.soonText, { color: COLORS.ink }]}>Edit articles (text & formatting)</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </Pressable>
        <Pressable style={styles.soonCard} onPress={() => router.push('/admin-experts')}>
          <Ionicons name="people-outline" size={20} color={COLORS.accent} />
          <Text style={[styles.soonText, { color: COLORS.ink }]}>Edit experts (photo & bio)</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </Pressable>
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Payouts</Text>
        <Pressable style={styles.soonCard} onPress={() => router.push('/admin-payouts')}>
          <Ionicons name="cash-outline" size={20} color={COLORS.accent} />
          <Text style={[styles.soonText, { color: COLORS.ink }]}>Expert payouts & splits</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function BackBar({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.backBar} onPress={onPress} hitSlop={10}>
      <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
      <Text style={styles.backText}>You</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  h1: { fontFamily: FONT_SERIF, fontSize: 32, color: COLORS.ink, marginBottom: 8 },
  locked: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 60 },
  lockedText: { fontSize: 15, color: COLORS.muted },
  sectionTitle: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginTop: 22, marginBottom: 12 },
  fieldLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  input: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 13, paddingHorizontal: 14, fontSize: 15, color: COLORS.ink },
  roleRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  roleChip: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line },
  roleChipOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  roleChipText: { fontSize: 14, color: COLORS.ink },
  roleChipTextOn: { color: COLORS.bg },
  applyBtn: { marginTop: 18, paddingVertical: 15, borderRadius: 999, backgroundColor: COLORS.accent, alignItems: 'center' },
  applyText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  status: { fontSize: 14, lineHeight: 20, color: COLORS.ink, marginTop: 14 },
  personRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 8 },
  personName: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  personEmail: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  badge: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, backgroundColor: COLORS.accentSoft },
  badgeStrong: { backgroundColor: COLORS.ink },
  badgeText: { fontSize: 12, color: COLORS.ink },
  badgeTextStrong: { color: COLORS.bg },
  soonCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  soonText: { fontSize: 14, color: COLORS.muted, flex: 1 },
});
