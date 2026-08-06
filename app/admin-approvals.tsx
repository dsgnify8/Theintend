import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from '@/components/Img';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { approveSubmission, rejectSubmission, usePendingSubmissions, type Submission } from '@/lib/submissions';

export default function AdminApprovals() {
  const router = useRouter();
  const { role } = useAuth();
  const { items, loading, reload } = usePendingSubmissions();
  const [working, setWorking] = useState<string | null>(null);

  if (role !== 'admin') {
    return <Wrap router={router}><View style={styles.center}><Text style={styles.muted}>Admins only.</Text></View></Wrap>;
  }

  const onApprove = async (s: Submission) => {
    setWorking(s.id);
    await approveSubmission(s);
    setWorking(null);
    reload();
  };
  const onReject = (s: Submission) => {
    // A reason, because a silent no reads as being ignored.
    Alert.prompt?.(
      'Why not yet',
      'This is sent to the expert. Leave it blank if you would rather explain another way.',
      [
        { text: 'Keep it waiting', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async (reason?: string) => {
            setWorking(s.id);
            await rejectSubmission(s.id, reason);
            setWorking(null);
            reload();
          },
        },
      ],
      'plain-text',
    ) ?? (async () => {
      // Android has no prompt, so it goes without one.
      setWorking(s.id);
      await rejectSubmission(s.id);
      setWorking(null);
      reload();
    })();
  };

  const label = (k: string) => (k === 'profile' ? 'PROFILE CHANGE' : k === 'class' ? 'NEW CLASS' : k === 'program' ? 'NEW PROGRAM' : k === 'session' ? 'NEW SESSION' : k === 'service_edit' ? 'CHANGE TO A LIVE OFFERING' : k.toUpperCase());

  return (
    <Wrap router={router}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Approvals</Text>
        <Text style={styles.sub}>Changes experts have proposed. Approve to make them live.</Text>

        {loading ? (
          <ActivityIndicator color={COLORS.accent} style={{ marginTop: 24 }} />
        ) : items.length === 0 ? (
          <View style={styles.empty}><Text style={styles.muted}>Nothing waiting for review.</Text></View>
        ) : (
          items.map((s) => (
            <View key={s.id} style={styles.card}>
              <Text style={styles.kind}>{label(s.kind)}</Text>
              <Text style={styles.expertId}>{s.expert_id}</Text>

              {s.kind === 'profile' ? (
                <>
                  {s.payload?.photo ? <Image source={{ uri: s.payload.photo }} style={styles.preview} resizeMode="cover" /> : null}
                  {s.payload?.bio ? <Text style={styles.bio}>{s.payload.bio}</Text> : null}
                </>
              ) : (
                <>
                  <Text style={styles.offerTitle}>{s.payload?.title}</Text>

                  {s.kind === 'service_edit' && s.payload?.changes ? (
                    <View style={styles.changeBox}>
                      {Object.entries(s.payload.changes).map(([field, v]: any) => (
                        <View key={field} style={styles.changeRow}>
                          <Text style={styles.changeField}>{fieldLabel(field)}</Text>
                          <Text style={styles.changeFrom}>{shownValue(v?.from)}</Text>
                          <Ionicons name="arrow-forward" size={13} color={COLORS.muted} />
                          <Text style={styles.changeTo}>{shownValue(v?.to)}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {s.kind === 'session' ? (
                    <Text style={styles.offerMeta}>
                      {[
                        s.payload?.price,
                        s.payload?.durationMin ? `${s.payload.durationMin} min` : null,
                        s.payload?.kind === 'package' ? `package of ${s.payload?.sessionsTotal ?? '?'}` : 'single session',
                        [s.payload?.online ? 'online' : null, s.payload?.inPerson ? 'in person' : null].filter(Boolean).join(' and '),
                      ].filter(Boolean).join('  \u00B7  ')}
                    </Text>
                  ) : null}
                  <Text style={styles.offerMeta}>
                    {s.kind === 'class'
                      ? `${s.payload?.date ?? ''} · ${s.payload?.durationHours ?? ''}h · ${s.payload?.category ?? ''}`
                      : `${s.payload?.weeks ?? ''} weeks · ${s.payload?.price ?? ''}`}
                  </Text>
                  {s.payload?.description ? <Text style={styles.bio}>{s.payload.description}</Text> : null}
                  {s.payload?.link ? <Text style={styles.offerMeta}>Link: {s.payload.link}</Text> : null}
                  {s.payload?.notes ? <Text style={styles.bio}>Notes: {s.payload.notes}</Text> : null}
                  {Array.isArray(s.payload?.signup_form) && s.payload.signup_form.length ? (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={styles.offerMeta}>Sign-up form</Text>
                      {s.payload.signup_form.map((q: any, i: number) => (
                        <View key={i} style={{ marginBottom: 6 }}>
                          <Text style={{ fontSize: 14, color: COLORS.ink }}>{i + 1}. {q.text} <Text style={{ color: COLORS.muted }}>({typeLabel(q.type)})</Text></Text>
                          {q.type === 'choice' && Array.isArray(q.options) ? (
                            <Text style={{ fontSize: 13, color: COLORS.muted, marginLeft: 12 }}>{q.options.join(', ')}</Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </>
              )}

              <View style={styles.actions}>
                <Pressable style={[styles.btn, styles.reject]} onPress={() => onReject(s)} disabled={working === s.id}>
                  <Text style={styles.rejectText}>Reject</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.approve]} onPress={() => onApprove(s)} disabled={working === s.id}>
                  {working === s.id ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.approveText}>Approve</Text>}
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </Wrap>
  );
}

function typeLabel(t: string) {
  return t === 'short' ? 'Short text' : t === 'long' ? 'Long text' : t === 'choice' ? 'Multiple choice' : t === 'yesno' ? 'Yes / No' : t;
}

function Wrap({ children, router }: { children: any; router: any }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Admin</Text>
      </Pressable>
      {children}
    </SafeAreaView>
  );
}

// Column names are not for reading.
function fieldLabel(f: string): string {
  return f === 'name' ? 'Name'
    : f === 'tagline' ? 'Short line'
    : f === 'price' ? 'Price'
    : f === 'durationMin' ? 'Length'
    : f === 'description' ? 'Description'
    : f === 'online' ? 'Online'
    : f === 'inPerson' ? 'In person'
    : f === 'location' ? 'Where'
    : f;
}

function shownValue(v: any): string {
  if (v === true) return 'yes';
  if (v === false) return 'no';
  if (v === null || v === undefined || v === '') return 'not set';
  return String(v);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 15, color: COLORS.muted },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  h1: { fontFamily: FONT_SERIF, fontSize: 32, color: COLORS.ink, marginBottom: 8 },
  sub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginBottom: 16 },
  empty: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 20, marginTop: 8 },
  card: { backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 18, marginBottom: 14 },
  kind: { fontSize: 11, letterSpacing: 1.5, color: COLORS.accent },
  changeBox: { backgroundColor: COLORS.accentSoft, borderRadius: 12, padding: 12, marginBottom: 12, gap: 8 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  changeField: { fontSize: 12, color: COLORS.muted, width: 88 },
  changeFrom: { fontSize: 14, color: COLORS.muted, textDecorationLine: 'line-through' },
  changeTo: { fontFamily: FONT_SERIF, fontSize: 15, color: COLORS.ink },
  expertId: { fontSize: 13, color: COLORS.muted, marginTop: 4, marginBottom: 10 },
  preview: { width: 84, height: 84, borderRadius: 42, marginBottom: 12 },
  offerTitle: { fontFamily: FONT_SERIF, fontSize: 18, color: COLORS.ink, marginBottom: 4 },
  offerMeta: { fontSize: 13, color: COLORS.muted, marginBottom: 10 },
  bio: { fontSize: 14, lineHeight: 21, color: COLORS.ink, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 999, alignItems: 'center' },
  reject: { borderWidth: 1, borderColor: COLORS.line },
  rejectText: { color: COLORS.ink, fontSize: 14 },
  approve: { backgroundColor: COLORS.accent },
  approveText: { color: COLORS.bg, fontSize: 14 },
});
