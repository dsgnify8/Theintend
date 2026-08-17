import { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { useExpert } from '@/lib/experts';
import { useExpertServices } from '@/lib/services';
import { removeService, saveService, serviceSlug } from '@/lib/adminServices';

const WASH = ['rgba(107,97,87,0.13)', 'rgba(107,97,87,0.04)', 'rgba(107,97,87,0)'];

const BLANK = {
  id: '', name: '', tagline: '', description: '', price: '',
  durationMin: '60', online: true, inPerson: false, location: '',
  kind: 'single', sessionsTotal: '', _isNew: true, _idTouched: false,
};

export default function AdminExpertServices() {
  const router = useRouter();
  const { id: expertId } = useLocalSearchParams<{ id: string }>();
  const { role } = useAuth();
  const { expert } = useExpert(expertId ? String(expertId) : undefined);
  const { services, loading } = useExpertServices(expertId ? String(expertId) : undefined);

  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const suggestedId = useMemo(
    () => (form?._isNew && !form?._idTouched && form?.name
      ? serviceSlug(String(expertId), form.name)
      : form?.id ?? ''),
    [form?.name, form?._isNew, form?._idTouched, expertId],
  );

  if (role !== 'admin') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Back onPress={() => router.back()} />
        <Text style={styles.muted}>Admins only.</Text>
      </SafeAreaView>
    );
  }

  const save = async () => {
    const id = (form._idTouched ? form.id : suggestedId).trim();
    if (!form.name?.trim()) { setStatus('It needs a name.'); return; }
    if (!id) { setStatus('It needs an id. The name usually fills it in.'); return; }
    if (!form.price?.trim()) { setStatus('It needs a price. Write it as people should read it.'); return; }
    if (!form.online && !form.inPerson) { setStatus('It has to be online, in person, or both.'); return; }
    if (form.kind === 'package' && !String(form.sessionsTotal).trim()) {
      setStatus('A package needs to say how many sessions are in it.'); return;
    }

    setBusy(true);
    setStatus(null);
    const { error } = await saveService({
      id,
      expert_id: String(expertId),
      name: form.name.trim(),
      tagline: form.tagline?.trim() ?? '',
      description: form.description?.trim() ?? '',
      price: form.price.trim(),
      duration_min: form.durationMin ? Number(form.durationMin) : null,
      online: !!form.online,
      in_person: !!form.inPerson,
      location: form.inPerson ? (form.location?.trim() || null) : null,
      kind: form.kind,
      sessions_total: form.kind === 'package' ? Number(form.sessionsTotal) || null : null,
    });
    setBusy(false);
    if (error) { setStatus(`Could not save: ${error.message}`); return; }
    setForm(null);
  };

  const remove = (s: any) => {
    Alert.alert(
      `Remove ${s.name}`,
      'It comes off their profile straight away. Anything already booked keeps its own details and is unaffected.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await removeService(s.id);
            if (error) Alert.alert('That did not work', error.message ?? 'Try again.');
            else setForm(null);
          },
        },
      ],
    );
  };

  const edit = (s: any) => {
    setStatus(null);
    setForm({
      id: s.id,
      name: s.name ?? '',
      tagline: s.tagline ?? '',
      description: s.description ?? '',
      price: s.price ?? '',
      durationMin: s.durationMin ? String(s.durationMin) : '',
      online: !!s.online,
      inPerson: !!s.inPerson,
      location: s.location ?? '',
      kind: s.kind ?? 'single',
      sessionsTotal: s.sessionsTotal ? String(s.sessionsTotal) : '',
      _isNew: false,
      _idTouched: true,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={WASH} style={styles.wash} pointerEvents="none" />
      <Back onPress={() => router.back()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.h1}>Sessions</Text>
          <Text style={styles.sub}>
            {expert ? `What people can book with ${expert.name}.` : 'What people can book.'}
            {' '}Added here they go live immediately, without the approvals queue.
          </Text>

          {form ? (
            <View style={styles.card}>
              <Text style={styles.formHead}>{form._isNew ? 'New session' : form.name}</Text>

              <Field label="Name" value={form.name} onChangeText={(t: string) => set('name', t)} placeholder="Initial consultation" />
              <Field
                label="Id"
                value={form._idTouched ? form.id : suggestedId}
                onChangeText={(t: string) => { set('_idTouched', true); set('id', t.toLowerCase().replace(/[^a-z0-9-]+/g, '-')); }}
                note={form._isNew ? 'Follows the name.' : 'Fixed, because bookings point at it.'}
                editable={form._isNew}
              />
              <Field label="Short line" value={form.tagline} onChangeText={(t: string) => set('tagline', t)} note="Under the name on the card." />
              <Field label="Description" value={form.description} onChangeText={(t: string) => set('description', t)} multiline note="What happens in it, and who it suits." />

              <View style={styles.two}>
                <View style={{ flex: 1 }}>
                  <Field label="Price" value={form.price} onChangeText={(t: string) => set('price', t)} placeholder="700 AED" note="As people should read it." />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Field label="Minutes" value={form.durationMin} onChangeText={(t: string) => set('durationMin', t.replace(/[^0-9]/g, ''))} placeholder="60" keyboardType="number-pad" />
                </View>
              </View>

              <Text style={styles.label}>Where</Text>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Online</Text>
                <Switch value={!!form.online} onValueChange={(v) => set('online', v)} trackColor={{ true: COLORS.ink, false: COLORS.line }} />
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>In person</Text>
                <Switch value={!!form.inPerson} onValueChange={(v) => set('inPerson', v)} trackColor={{ true: COLORS.ink, false: COLORS.line }} />
              </View>
              {form.inPerson ? (
                <Field label="Where in person" value={form.location} onChangeText={(t: string) => set('location', t)} placeholder="Dubai" />
              ) : null}

              <Text style={styles.label}>What kind</Text>
              <View style={styles.kindRow}>
                {(['single', 'package'] as const).map((k) => (
                  <Pressable key={k} onPress={() => set('kind', k)} style={[styles.kindChip, form.kind === k && styles.kindChipOn]}>
                    <Text style={[styles.kindText, form.kind === k && styles.kindTextOn]}>
                      {k === 'single' ? 'One session' : 'A package'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {form.kind === 'package' ? (
                <Field
                  label="Sessions in it"
                  value={String(form.sessionsTotal)}
                  onChangeText={(t: string) => set('sessionsTotal', t.replace(/[^0-9]/g, ''))}
                  placeholder="6"
                  keyboardType="number-pad"
                  note="Bought once, booked one at a time. The count is kept for them."
                />
              ) : null}

              {status ? <Text style={styles.status}>{status}</Text> : null}

              <Pressable style={[styles.saveBtn, busy && { opacity: 0.6 }]} disabled={busy} onPress={save}>
                {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.saveText}>Save</Text>}
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => { setForm(null); setStatus(null); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.addBtn} onPress={() => { setForm({ ...BLANK }); setStatus(null); }}>
              <Ionicons name="add" size={18} color={COLORS.bg} />
              <Text style={styles.addText}>Add a session</Text>
            </Pressable>
          )}

          {loading ? (
            <ActivityIndicator color={COLORS.accent} style={{ marginTop: 24 }} />
          ) : services.length === 0 ? (
            <Text style={styles.emptyText}>
              Nothing yet. Until there is, their profile has no way to book them.
            </Text>
          ) : (
            services.map((s: any) => (
              <View key={s.id} style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.rowMeta}>
                    {[
                      s.price,
                      s.durationMin ? `${s.durationMin} min` : null,
                      s.kind === 'package' ? `package of ${s.sessionsTotal ?? '?'}` : null,
                      [s.online ? 'online' : null, s.inPerson ? 'in person' : null].filter(Boolean).join(' and '),
                    ].filter(Boolean).join('  ·  ')}
                  </Text>
                </View>
                <Pressable onPress={() => edit(s)} hitSlop={10}>
                  <Ionicons name="create-outline" size={19} color={COLORS.muted} />
                </Pressable>
                <Pressable onPress={() => remove(s)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={18} color="#8F4A3B" />
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, note, placeholder, multiline, editable = true, keyboardType }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.muted}
        editable={editable}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={label === 'Id' ? 'none' : 'sentences'}
        style={[styles.input, multiline && styles.inputMulti, !editable && styles.inputOff]}
      />
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

function Back({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.backBar} onPress={onPress} hitSlop={10}>
      <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
      <Text style={styles.backText}>Back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  h1: { fontFamily: FONT_SERIF, fontSize: 30, color: COLORS.ink, marginBottom: 4 },
  sub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginBottom: 18 },
  muted: { fontSize: 15, color: COLORS.muted, padding: 24 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: COLORS.ink, borderRadius: 999, paddingVertical: 14, marginBottom: 18 },
  addText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.3 },

  card: { backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 18 },
  formHead: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginBottom: 14 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  note: { fontSize: 12, lineHeight: 18, color: COLORS.muted, marginTop: 5 },
  input: { backgroundColor: COLORS.bg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: COLORS.ink },
  inputMulti: { minHeight: 84, textAlignVertical: 'top' },
  inputOff: { opacity: 0.55 },
  two: { flexDirection: 'row' },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { fontSize: 15, color: COLORS.ink },
  kindRow: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 14 },
  kindChip: { flex: 1, paddingVertical: 11, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center' },
  kindChipOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  kindText: { fontSize: 13, color: COLORS.ink },
  kindTextOn: { color: COLORS.bg },

  status: { fontSize: 13, lineHeight: 19, color: COLORS.accent, marginTop: 10 },
  saveBtn: { marginTop: 14, paddingVertical: 15, borderRadius: 999, backgroundColor: COLORS.ink, alignItems: 'center' },
  saveText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.4 },
  cancelBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 14, color: COLORS.muted },

  row2: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 14, marginBottom: 8 },
  rowTitle: { fontFamily: FONT_SERIF, fontSize: 15, color: COLORS.ink },
  rowMeta: { fontSize: 12, lineHeight: 18, color: COLORS.muted, marginTop: 3 },
  emptyText: { fontSize: 14, lineHeight: 21, color: COLORS.muted, paddingVertical: 24, textAlign: 'center' },
});
