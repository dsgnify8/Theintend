import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const onReject = async (s: Submission) => {
    setWorking(s.id);
    await rejectSubmission(s.id);
    setWorking(null);
    reload();
  };

  const label = (k: string) => (k === 'profile' ? 'PROFILE CHANGE' : k === 'class' ? 'NEW CLASS' : k === 'program' ? 'NEW PROGRAM' : k.toUpperCase());

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
