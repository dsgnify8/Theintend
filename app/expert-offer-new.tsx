import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { getExpertForEmail } from '@/lib/experts';
import { submitNewOffering } from '@/lib/submissions';
import type { Expert } from '@/constants/experts';

export default function ExpertOfferNew() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [expert, setExpert] = useState<Expert | null | undefined>(undefined);
  const [kind, setKind] = useState<'class' | 'program'>('class');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // class fields
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [durationHours, setDurationHours] = useState('1');
  const [category, setCategory] = useState('');
  // program fields
  const [weeks, setWeeks] = useState('');
  const [sessions, setSessions] = useState('');
  const [cadence, setCadence] = useState('');
  const [price, setPrice] = useState('');
  const [requiresForm, setRequiresForm] = useState(false);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) getExpertForEmail(user.email).then(setExpert);
    else setExpert(null);
  }, [user?.email]);

  if (role !== 'expert' && role !== 'admin') {
    return <Wrap router={router}><View style={styles.center}><Text style={styles.muted}>Experts only.</Text></View></Wrap>;
  }
  if (expert === undefined) {
    return <Wrap router={router}><View style={styles.center}><ActivityIndicator color={COLORS.accent} /></View></Wrap>;
  }
  if (!expert) {
    return <Wrap router={router}><View style={styles.center}><Text style={styles.muted}>Your profile isn't linked yet.</Text></View></Wrap>;
  }

  const submit = async () => {
    if (!title.trim()) {
      setStatus('Please add a title.');
      return;
    }
    setBusy(true);
    setStatus(null);
    const payload =
      kind === 'class'
        ? { title, description, date, time, durationHours, category, expert_title: expert.title }
        : { title, description, weeks, sessions, cadence, price, requiresForm };
    const { error } = await submitNewOffering(expert.id, expert.name, kind, payload);
    setStatus(error ? `Could not submit: ${error.message}` : 'Submitted. Your new offering is pending admin approval.');
    setBusy(false);
  };

  return (
    <Wrap router={router}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.h1}>Propose an offering</Text>
          <Text style={styles.sub}>Once approved by the team, it appears on the Sessions page.</Text>

          <View style={styles.segment}>
            {(['class', 'program'] as const).map((k) => {
              const on = k === kind;
              return (
                <Pressable key={k} onPress={() => setKind(k)} style={[styles.segItem, on && styles.segItemOn]}>
                  <Text style={[styles.segText, on && styles.segTextOn]}>{k === 'class' ? 'Class' : 'Program'}</Text>
                </Pressable>
              );
            })}
          </View>

          <Field label="Title" value={title} onChangeText={setTitle} />
          <Field label="Description" value={description} onChangeText={setDescription} multiline />

          {kind === 'class' ? (
            <>
              <Field label="Date (e.g. Thu 10 Jul)" value={date} onChangeText={setDate} />
              <Field label="Time (e.g. 6:00 PM – 7:00 PM GST)" value={time} onChangeText={setTime} />
              <Field label="Duration in hours (e.g. 1.5)" value={durationHours} onChangeText={setDurationHours} keyboardType="decimal-pad" />
              <Field label="Category (e.g. Breathwork)" value={category} onChangeText={setCategory} />
            </>
          ) : (
            <>
              <Field label="Weeks (e.g. 6)" value={weeks} onChangeText={setWeeks} keyboardType="number-pad" />
              <Field label="Number of sessions (e.g. 6)" value={sessions} onChangeText={setSessions} keyboardType="number-pad" />
              <Field label="Cadence (e.g. Weekly, 60 min live)" value={cadence} onChangeText={setCadence} />
              <Field label="Price (e.g. AED 1,800)" value={price} onChangeText={setPrice} />
              <Pressable style={styles.toggleRow} onPress={() => setRequiresForm((v) => !v)}>
                <Text style={styles.toggleLabel}>Needs a sign-up form</Text>
                <View style={[styles.toggle, requiresForm && styles.toggleOn]}>
                  <View style={[styles.knob, requiresForm && styles.knobOn]} />
                </View>
              </Pressable>
            </>
          )}

          <Pressable style={styles.saveBtn} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.saveText}>Submit for approval</Text>}
          </Pressable>
          {status ? <Text style={styles.status}>{status}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Wrap>
  );
}

function Field({ label, value, onChangeText, multiline, keyboardType }: { label: string; value: string; onChangeText: (t: string) => void; multiline?: boolean; keyboardType?: any }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.inputMulti]}
        placeholderTextColor={COLORS.muted}
      />
    </View>
  );
}

function Wrap({ children, router }: { children: any; router: any }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Expert panel</Text>
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
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  h1: { fontFamily: FONT_SERIF, fontSize: 30, color: COLORS.ink, marginBottom: 6 },
  sub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginBottom: 18 },
  segment: { flexDirection: 'row', backgroundColor: COLORS.accentSoft, borderRadius: 999, padding: 4, marginBottom: 20 },
  segItem: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  segItemOn: { backgroundColor: COLORS.ink },
  segText: { fontSize: 14, color: COLORS.ink },
  segTextOn: { color: COLORS.bg },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  input: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: COLORS.ink },
  inputMulti: { minHeight: 90, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, marginBottom: 6 },
  toggleLabel: { fontSize: 15, color: COLORS.ink },
  toggle: { width: 50, height: 30, borderRadius: 999, backgroundColor: COLORS.line, padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: COLORS.accent },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.bg },
  knobOn: { alignSelf: 'flex-end' },
  saveBtn: { marginTop: 18, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.accent, alignItems: 'center' },
  saveText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  status: { fontSize: 14, lineHeight: 20, color: COLORS.ink, marginTop: 14, textAlign: 'center' },
});
