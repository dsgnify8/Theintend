import { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { Image } from '@/components/Img';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { useExpert } from '@/lib/experts';
import { createSession, deleteSession, uploadSessionImage, useSessions } from '@/lib/sessions';

const WASH = ['rgba(107,97,87,0.13)', 'rgba(107,97,87,0.04)', 'rgba(107,97,87,0)'];

const BLANK = {
  kind: 'class',
  id: '', title: '', description: '', category: '', color: '#5C4632', image: '',
  // A class
  date: '', time: '', durationHours: '1', link: '',
  // A program
  weeks: '', sessionsCount: '', cadence: '', price: '', requiresForm: false,
  _isNew: true, _idTouched: false,
};

function slug(expertId: string, title: string) {
  const tail = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 34);
  return `${expertId}-${tail}`;
}

export default function AdminExpertEvents() {
  const router = useRouter();
  const { id: expertId } = useLocalSearchParams<{ id: string }>();
  const { role } = useAuth();
  const { expert } = useExpert(expertId ? String(expertId) : undefined);
  const { classes, programs, loading } = useSessions();

  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const isClass = form?.kind === 'class';

  const mine = useMemo(() => ({
    classes: classes.filter((c: any) => c.expertId === expertId),
    programs: programs.filter((p: any) => p.expertId === expertId),
  }), [classes, programs, expertId]);

  const suggestedId = useMemo(
    () => (form?._isNew && !form?._idTouched && form?.title ? slug(String(expertId), form.title) : form?.id ?? ''),
    [form?.title, form?._isNew, form?._idTouched, expertId],
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

  const pickImage = async () => {
    const id = (form._idTouched ? form.id : suggestedId).trim();
    if (!id) { setStatus('Give it a title first, so the image has somewhere to go.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [16, 9], quality: 0.75, base64: true });
    if (res.canceled || !res.assets?.[0]?.base64) return;
    setUploading(true);
    setStatus(null);
    try {
      set('image', await uploadSessionImage(id, res.assets[0].base64));
    } catch (e: any) {
      setStatus(`Image upload failed: ${e?.message ?? 'unknown error'}`);
    }
    setUploading(false);
  };

  const save = async () => {
    const id = (form._idTouched ? form.id : suggestedId).trim();
    if (!form.title?.trim()) { setStatus('It needs a title.'); return; }
    if (!id) { setStatus('It needs an id. The title usually fills it in.'); return; }
    if (isClass && !form.date?.trim()) { setStatus('A class needs a date, so people know when to come.'); return; }
    if (!isClass && !form.price?.trim()) { setStatus('A program needs a price.'); return; }

    setBusy(true);
    setStatus(null);

    const shared = {
      id,
      kind: form.kind,
      title: form.title.trim(),
      description: form.description?.trim() ?? '',
      expert_id: String(expertId),
      expert_name: expert?.name ?? '',
      category: form.category?.trim() || expert?.category || '',
      color: form.color || '#5C4632',
      image: form.image?.trim() || null,
      status: 'live',
    };

    const row = isClass
      ? {
          ...shared,
          expert_title: expert?.title ?? '',
          date: form.date.trim(),
          time: form.time?.trim() ?? '',
          duration_hours: Number(form.durationHours) || 1,
          // Only the person who booked ever sees this.
          link: form.link?.trim() || '',
        }
      : {
          ...shared,
          weeks: Number(form.weeks) || 0,
          sessions_count: Number(form.sessionsCount) || 0,
          cadence: form.cadence?.trim() ?? '',
          price: form.price.trim(),
          requires_form: !!form.requiresForm,
        };

    const { error } = await createSession(row);
    setBusy(false);
    if (error) { setStatus(`Could not save: ${error.message}`); return; }
    setForm(null);
  };

  const remove = (item: any, kind: string) => {
    Alert.alert(
      `Remove ${item.title}`,
      'It comes off the Sessions page. Anyone already booked keeps their booking, and the record is archived rather than deleted.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteSession(item.id);
            if (error) Alert.alert('That did not work', error.message ?? 'Try again.');
            else setForm(null);
          },
        },
      ],
    );
  };

  const edit = (item: any, kind: 'class' | 'program') => {
    setStatus(null);
    setForm({
      kind,
      id: item.id,
      title: item.title ?? '',
      description: item.description ?? '',
      category: item.category ?? '',
      color: item.color ?? '#5C4632',
      image: typeof item.banner === 'object' && item.banner?.uri ? item.banner.uri : '',
      date: item.date ?? '',
      time: item.time ?? '',
      durationHours: item.durationHours ? String(item.durationHours) : '1',
      link: item.link ?? '',
      weeks: item.weeks ? String(item.weeks) : '',
      sessionsCount: item.sessions ? String(item.sessions) : '',
      cadence: item.cadence ?? '',
      price: item.price ?? '',
      requiresForm: !!item.requiresForm,
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
          <Text style={styles.h1}>Classes and programs</Text>
          <Text style={styles.sub}>
            {expert ? `Everything ${expert.name} runs over time or for a group.` : 'Everything run over time or for a group.'}
            {' '}These go live immediately.
          </Text>

          {form ? (
            <View style={styles.card}>
              <View style={styles.kindRow}>
                {(['class', 'program'] as const).map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => form._isNew && set('kind', k)}
                    style={[styles.kindChip, form.kind === k && styles.kindChipOn, !form._isNew && form.kind !== k && { opacity: 0.35 }]}
                  >
                    <Text style={[styles.kindText, form.kind === k && styles.kindTextOn]}>
                      {k === 'class' ? 'A class' : 'A program'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.kindNote}>
                {isClass
                  ? 'One occasion, on a date, online or in a room. A webinar is a class.'
                  : 'Several sessions over weeks, bought once.'}
              </Text>

              <Field label="Title" value={form.title} onChangeText={(t: string) => set('title', t)} />
              <Field
                label="Id"
                value={form._idTouched ? form.id : suggestedId}
                onChangeText={(t: string) => { set('_idTouched', true); set('id', t.toLowerCase().replace(/[^a-z0-9-]+/g, '-')); }}
                note={form._isNew ? 'Follows the title.' : 'Fixed, because bookings point at it.'}
                editable={form._isNew}
              />
              <Field label="Description" value={form.description} onChangeText={(t: string) => set('description', t)} multiline />
              <Field label="Category" value={form.category} onChangeText={(t: string) => set('category', t)} note={`Left empty it uses ${expert?.category || 'theirs'}.`} />

              <Text style={styles.label}>Banner</Text>
              <View style={styles.pickRow}>
                <Pressable style={styles.pickBtn} onPress={pickImage} disabled={uploading}>
                  {uploading
                    ? <ActivityIndicator color={COLORS.ink} />
                    : <><Ionicons name="image-outline" size={15} color={COLORS.ink} /><Text style={styles.pickText}>Choose image</Text></>}
                </Pressable>
                {form.image ? <Image source={{ uri: form.image }} style={styles.imgPeek} resizeMode="cover" /> : null}
              </View>

              {isClass ? (
                <>
                  <View style={styles.two}>
                    <View style={{ flex: 1 }}>
                      <Field label="Date" value={form.date} onChangeText={(t: string) => set('date', t)} placeholder="Thu 10 Jul" />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Field label="Time" value={form.time} onChangeText={(t: string) => set('time', t)} placeholder="7:00 pm" />
                    </View>
                  </View>
                  <Field label="Hours" value={form.durationHours} onChangeText={(t: string) => set('durationHours', t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
                  <Field
                    label="Joining link"
                    value={form.link}
                    onChangeText={(t: string) => set('link', t)}
                    placeholder="https://"
                    autoCapitalize="none"
                    note="Optional. Only shown to someone who has booked, never on the card, so nobody can join without one."
                  />
                </>
              ) : (
                <>
                  <View style={styles.two}>
                    <View style={{ flex: 1 }}>
                      <Field label="Weeks" value={form.weeks} onChangeText={(t: string) => set('weeks', t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Field label="Sessions" value={form.sessionsCount} onChangeText={(t: string) => set('sessionsCount', t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
                    </View>
                  </View>
                  <Field label="How often" value={form.cadence} onChangeText={(t: string) => set('cadence', t)} placeholder="Weekly, 60 minutes" />
                  <Field label="Price" value={form.price} onChangeText={(t: string) => set('price', t)} placeholder="4,200 AED" note="As people should read it." />
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowLabel}>Ask a few questions first</Text>
                      <Text style={styles.note}>A short form before paying, so they arrive knowing something about the person.</Text>
                    </View>
                    <Switch value={!!form.requiresForm} onValueChange={(v) => set('requiresForm', v)} trackColor={{ true: COLORS.ink, false: COLORS.line }} />
                  </View>
                </>
              )}

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
              <Text style={styles.addText}>Add a class or program</Text>
            </Pressable>
          )}

          {loading ? (
            <ActivityIndicator color={COLORS.accent} style={{ marginTop: 24 }} />
          ) : (
            <>
              {mine.classes.length > 0 ? (
                <>
                  <Text style={styles.group}>CLASSES</Text>
                  {mine.classes.map((c: any) => (
                    <ItemRow
                      key={c.id}
                      title={c.title}
                      meta={[c.date, c.time, c.durationHours ? `${c.durationHours} hr` : null, c.link ? 'has a link' : null].filter(Boolean).join('  ·  ')}
                      onEdit={() => edit(c, 'class')}
                      onRemove={() => remove(c, 'class')}
                    />
                  ))}
                </>
              ) : null}

              {mine.programs.length > 0 ? (
                <>
                  <Text style={styles.group}>PROGRAMS</Text>
                  {mine.programs.map((p: any) => (
                    <ItemRow
                      key={p.id}
                      title={p.title}
                      meta={[p.price, p.weeks ? `${p.weeks} weeks` : null, p.sessions ? `${p.sessions} sessions` : null].filter(Boolean).join('  ·  ')}
                      onEdit={() => edit(p, 'program')}
                      onRemove={() => remove(p, 'program')}
                    />
                  ))}
                </>
              ) : null}

              {mine.classes.length === 0 && mine.programs.length === 0 ? (
                <Text style={styles.emptyText}>Nothing yet. One to one sessions are on the other screen.</Text>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ItemRow({ title, meta, onEdit, onRemove }: any) {
  return (
    <View style={styles.row2}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>{meta}</Text>
      </View>
      <Pressable onPress={onEdit} hitSlop={10}>
        <Ionicons name="create-outline" size={19} color={COLORS.muted} />
      </Pressable>
      <Pressable onPress={onRemove} hitSlop={10}>
        <Ionicons name="trash-outline" size={18} color="#8F4A3B" />
      </Pressable>
    </View>
  );
}

function Field({ label, value, onChangeText, note, placeholder, multiline, editable = true, keyboardType, autoCapitalize }: any) {
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
        autoCapitalize={autoCapitalize ?? (label === 'Id' ? 'none' : 'sentences')}
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
  h1: { fontFamily: FONT_SERIF, fontSize: 30, lineHeight: 36, color: COLORS.ink, marginBottom: 4 },
  sub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginBottom: 18 },
  muted: { fontSize: 15, color: COLORS.muted, padding: 24 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: COLORS.ink, borderRadius: 999, paddingVertical: 14, marginBottom: 18 },
  addText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.3 },

  card: { backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 18 },
  kindRow: { flexDirection: 'row', gap: 8 },
  kindChip: { flex: 1, paddingVertical: 11, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center' },
  kindChipOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  kindText: { fontSize: 13, color: COLORS.ink },
  kindTextOn: { color: COLORS.bg },
  kindNote: { fontSize: 12, lineHeight: 18, color: COLORS.muted, marginTop: 10, marginBottom: 16 },

  field: { marginBottom: 14 },
  label: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  note: { fontSize: 12, lineHeight: 18, color: COLORS.muted, marginTop: 5 },
  input: { backgroundColor: COLORS.bg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: COLORS.ink },
  inputMulti: { minHeight: 84, textAlignVertical: 'top' },
  inputOff: { opacity: 0.55 },
  two: { flexDirection: 'row' },

  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: COLORS.line, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16 },
  pickText: { fontSize: 14, color: COLORS.ink },
  imgPeek: { width: 56, height: 32, borderRadius: 6 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2, marginBottom: 12 },
  rowLabel: { fontSize: 15, color: COLORS.ink },

  status: { fontSize: 13, lineHeight: 19, color: COLORS.accent, marginTop: 10 },
  saveBtn: { marginTop: 14, paddingVertical: 15, borderRadius: 999, backgroundColor: COLORS.ink, alignItems: 'center' },
  saveText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.4 },
  cancelBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 14, color: COLORS.muted },

  group: { fontSize: 10, letterSpacing: 2.4, color: COLORS.muted, marginTop: 22, marginBottom: 10 },
  row2: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 14, marginBottom: 8 },
  rowTitle: { fontFamily: FONT_SERIF, fontSize: 15, color: COLORS.ink },
  rowMeta: { fontSize: 12, lineHeight: 18, color: COLORS.muted, marginTop: 3 },
  emptyText: { fontSize: 14, lineHeight: 21, color: COLORS.muted, paddingVertical: 24, textAlign: 'center' },
});
