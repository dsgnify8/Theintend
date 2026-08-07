import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { setUserRole, useAllProfiles } from '@/lib/admin';
import { usePendingSubmissions } from '@/lib/submissions';
import { useUnpaidCount } from '@/lib/payouts';
import { useExperts } from '@/lib/experts';
import { SLOT_HOME_ARTICLES, useFeaturedList } from '@/lib/featured';

// Behind the top of the page, matching the library and My Companion.
const ADMIN_WASH = ['rgba(107,97,87,0.13)', 'rgba(107,97,87,0.04)', 'rgba(107,97,87,0)'];

const ROLES = ['user', 'expert', 'admin'];
const PEOPLE_PAGE = 3;

export default function Admin() {
  const router = useRouter();
  const { role } = useAuth();
  const pending = usePendingSubmissions();
  const unpaid = useUnpaidCount();
  const expertList = useExperts();
  const pinnedArticles = useFeaturedList(SLOT_HOME_ARTICLES);
  const { profiles, loading, reload } = useAllProfiles();

  const [rolesOpen, setRolesOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState('expert');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p: any) =>
      (p.full_name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q)
    );
  }, [profiles, query]);

  const shown = showAll ? filtered : filtered.slice(0, PEOPLE_PAGE);

  // Suggestions for the role field. Nothing until two characters, and nothing
  // once the address already matches exactly.
  const emailMatches = useMemo(() => {
    const q = email.trim().toLowerCase();
    if (q.length < 2) return [];
    const list = (profiles as any[]).filter((p) => (p.email || '').toLowerCase().includes(q));
    if (list.length === 1 && (list[0].email || '').toLowerCase() === q) return [];
    return list.slice(0, 5);
  }, [profiles, email]);
  const staff = profiles.filter((p: any) => p.role !== 'user').length;

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
      <LinearGradient colors={ADMIN_WASH} style={styles.wash} pointerEvents="none" />
      <BackBar onPress={() => router.back()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Admin</Text>
        <Text style={styles.sub}>Everything that runs the platform, in one place.</Text>

        <GroupLabel>Review</GroupLabel>
        <Row
          icon="checkmark-done-outline"
          title="Approvals queue"
          meta="Profile changes and new offerings waiting on you"
          count={pending.items.length ? String(pending.items.length) : null}
          onPress={() => router.push('/admin-approvals')}
        />

        <Row
          icon="calendar-outline"
          title="Bookings"
          meta="Everything booked, and the only place to cancel one"
          onPress={() => router.push('/admin-bookings')}
        />

        <GroupLabel>Content</GroupLabel>
        <Row
          icon="document-text-outline"
          title="Articles"
          meta="Edit the text and formatting of anything published"
          onPress={() => router.push('/admin-articles')}
        />
        <Row
          icon="people-outline"
          title="Experts"
          meta="Photos, bios and how each profile reads"
          count={expertList.experts.length ? String(expertList.experts.length) : null}
          onPress={() => router.push('/admin-experts')}
        />
        <Row
          icon="star-outline"
          title="Featured on home"
          meta="Choose what leads the homepage this week"
          count={pinnedArticles.length ? `${pinnedArticles.length} pinned` : 'Automatic'}
          onPress={() => router.push('/admin-featured')}
        />

        <View>
          <GroupLabel>People</GroupLabel>
        </View>
        <Pressable style={styles.foldHead} onPress={() => setRolesOpen((v) => !v)}>
          <View style={styles.rowIcon}>
            <Ionicons name="key-outline" size={19} color={COLORS.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Roles and access</Text>
            <Text style={styles.rowMeta}>
              {staff} with expert or admin access
            </Text>
          </View>
          <Ionicons name={rolesOpen ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.muted} />
        </Pressable>

        {rolesOpen ? (
          <View style={styles.foldBody}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="person@email.com"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.input}
            />
            {emailMatches.length ? (
              <View style={styles.suggestBox}>
                {emailMatches.map((m: any) => (
                  <Pressable key={m.id} style={styles.suggestRow} onPress={() => setEmail(m.email)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestEmail}>{m.email}</Text>
                      {m.full_name ? <Text style={styles.suggestName}>{m.full_name}</Text> : null}
                    </View>
                    <Text style={styles.suggestRole}>{m.role}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
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
            <Text style={styles.foldHint}>Tap anyone below to fill their email in here.</Text>
          </View>
        ) : null}

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={17} color={COLORS.muted} />
          <TextInput
            value={query}
            onChangeText={(t) => { setQuery(t); setShowAll(false); }}
            placeholder="Search everyone"
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

        {loading ? (
          <ActivityIndicator color={COLORS.accent} style={{ marginTop: 16 }} />
        ) : filtered.length === 0 ? (
          <Text style={styles.emptyText}>No one matches that.</Text>
        ) : (
          <>
            {shown.map((p: any) => (
              <Pressable
                key={p.id}
                style={styles.personRow}
                onPress={() => { setEmail(p.email || ''); setRolesOpen(true); }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{p.full_name || '(no name)'}</Text>
                  <Text style={styles.personEmail}>{p.email}</Text>
                </View>
                <View style={[styles.badge, p.role !== 'user' && styles.badgeStrong]}>
                  <Text style={[styles.badgeText, p.role !== 'user' && styles.badgeTextStrong]}>{p.role}</Text>
                </View>
              </Pressable>
            ))}
            <Pressable onPress={() => router.push('/admin-people')} style={styles.moreBtn}>
              <Text style={styles.moreText}>
                {`See all ${profiles.length}`}
              </Text>
            </Pressable>
          </>
        )}

        <GroupLabel>Money</GroupLabel>
        <Row
          icon="cash-outline"
          title="Payouts and splits"
          meta="What each expert keeps, their bank details, and how people pay"
          count={unpaid ? `${unpaid} to pay` : null}
          onPress={() => router.push('/admin-payouts')}
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.groupLabel}>{String(children).toUpperCase()}</Text>;
}

function Row({ icon, title, meta, count, onPress, targetRef, onLayout }: { icon: any; title: string; meta: string; count?: string | null; onPress: () => void; targetRef?: any; onLayout?: (e: any) => void }) {
  return (
    <Pressable ref={targetRef} onLayout={onLayout} style={styles.row} onPress={onPress}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={19} color={COLORS.accent} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowMeta}>{meta}</Text>
      </View>
      {count ? <Text style={styles.countText}>{count}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
    </Pressable>
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
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 56 },
  h1: { fontFamily: FONT_SERIF, fontSize: 32, color: COLORS.ink, marginBottom: 6 },
  sub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginBottom: 8 },
  locked: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 60 },
  lockedText: { fontSize: 15, color: COLORS.muted },

  groupLabel: { fontSize: 10, letterSpacing: 2.4, color: COLORS.muted, marginTop: 30, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  rowIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowTitle: { fontFamily: FONT_SERIF, fontSize: 17, color: COLORS.ink },
  rowMeta: { fontSize: 12, lineHeight: 17, color: COLORS.muted, marginTop: 3 },
  countText: { fontSize: 12, color: COLORS.bg, backgroundColor: COLORS.ink, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, overflow: 'hidden', marginRight: 10 },

  foldHead: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16 },
  foldBody: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderTopWidth: 0, borderColor: COLORS.line, marginTop: -8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
  foldHint: { fontSize: 12, color: COLORS.muted, marginTop: 14 },

  fieldLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  input: { backgroundColor: COLORS.bg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 13, paddingHorizontal: 14, fontSize: 15, color: COLORS.ink },
  suggestBox: { backgroundColor: COLORS.bg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, marginTop: 8, overflow: 'hidden' },
  suggestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  suggestEmail: { fontSize: 14, color: COLORS.ink },
  suggestName: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  suggestRole: { fontSize: 11, color: COLORS.muted },
  roleRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  roleChip: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line },
  roleChipOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  roleChipText: { fontSize: 14, color: COLORS.ink },
  roleChipTextOn: { color: COLORS.bg },
  applyBtn: { marginTop: 18, paddingVertical: 15, borderRadius: 999, backgroundColor: COLORS.taupeBlue, alignItems: 'center' },
  applyText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  status: { fontSize: 14, lineHeight: 20, color: COLORS.ink, marginTop: 14 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: COLORS.card, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 16, paddingVertical: 11, marginTop: 14, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.ink, padding: 0 },
  emptyText: { fontSize: 14, color: COLORS.muted, paddingVertical: 20, textAlign: 'center' },
  personRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 8 },
  personName: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  personEmail: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  badge: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, backgroundColor: COLORS.accentSoft },
  badgeStrong: { backgroundColor: COLORS.ink },
  badgeText: { fontSize: 12, color: COLORS.ink },
  badgeTextStrong: { color: COLORS.bg },
  moreBtn: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 20 },
  moreText: { fontSize: 14, color: COLORS.accent },
});
