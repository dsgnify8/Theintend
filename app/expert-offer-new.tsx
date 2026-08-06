import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { getExpertForEmail } from '@/lib/experts';
import { submitNewOffering, submitServiceEdit } from '@/lib/submissions';
import { useExpertServices } from '@/lib/services';
import type { Expert } from '@/constants/experts';

type QType = 'short' | 'long' | 'choice' | 'yesno';
type Question = { id: string; text: string; type: QType; options: string[] };

const TYPES: { key: QType; label: string }[] = [
  { key: 'short', label: 'Short text' },
  { key: 'long', label: 'Long text' },
  { key: 'choice', label: 'Multiple choice' },
  { key: 'yesno', label: 'Yes / No' },
];

function newQuestion(): Question {
  return { id: Math.random().toString(36).slice(2), text: '', type: 'short', options: ['', ''] };
}

export default function ExpertOfferNew() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [expert, setExpert] = useState<Expert | null | undefined>(undefined);
  const [kind, setKind] = useState<'class' | 'program' | 'session'>('class');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // class fields
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [durationHours, setDurationHours] = useState('1');
  const [category, setCategory] = useState('');
  const [link, setLink] = useState('');
  // program fields
  const [weeks, setWeeks] = useState('');
  const [sessions, setSessions] = useState('');
  const [cadence, setCadence] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [requiresForm, setRequiresForm] = useState(false);
  // What the services table needs in order for a session to be bookable.
  const [tagline, setTagline] = useState('');
  const [durationMin, setDurationMin] = useState('60');
  const [online, setOnline] = useState(true);
  const [inPerson, setInPerson] = useState(false);
  const [isPackage, setIsPackage] = useState(false);
  const [sessionsTotal, setSessionsTotal] = useState('5');
  const [location, setLocation] = useState('');

  // Proposing something new, or changing one that is already live.
  const [mode, setMode] = useState<'new' | 'edit'>('new');
  const [editingId, setEditingId] = useState<string | null>(null);
  const { services: mine } = useExpertServices(expert?.id);
  const editing = mine.find((x: any) => x.id === editingId) ?? null;

  // Filled with what it is now, so a change is a change rather than a rewrite.
  useEffect(() => {
    if (!editing) return;
    setTitle(editing.name ?? '');
    setTagline(editing.tagline ?? '');
    setDescription((editing as any).description ?? '');
    setPrice(editing.price ?? '');
    setDurationMin(editing.durationMin ? String(editing.durationMin) : '');
    setOnline(!!editing.online);
    setInPerson(!!editing.inPerson);
    setLocation((editing as any).location ?? '');
  }, [editingId]);

  const submitChange = async () => {
    if (!expert || !editing) return;
    setBusy(true);
    setStatus(null);
    const { error } = await submitServiceEdit(
      expert.id,
      { id: editing.id, name: editing.name },
      {
        name: editing.name ?? '',
        tagline: editing.tagline ?? '',
        description: (editing as any).description ?? '',
        price: editing.price ?? '',
        durationMin: editing.durationMin ?? null,
        online: !!editing.online,
        inPerson: !!editing.inPerson,
        location: (editing as any).location ?? '',
      },
      {
        name: title.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        price: price.trim(),
        durationMin: durationMin ? Number(durationMin) : null,
        online,
        inPerson,
        location: inPerson ? location.trim() : '',
      },
    );
    setStatus(error ? `Could not submit: ${error.message}` : 'Sent for approval. It stays as it is until the team says yes.');
    setBusy(false);
  };
  // sign-up form builder
  const [formOpen, setFormOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([newQuestion()]);
  const [formMsg, setFormMsg] = useState<string | null>(null);

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

  // form builder helpers
  const updateQ = (id: string, patch: Partial<Question>) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const removeQ = (id: string) => setQuestions((qs) => (qs.length > 1 ? qs.filter((q) => q.id !== id) : qs));
  const addOption = (id: string) => setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, options: [...q.options, ''] } : q)));
  const setOption = (id: string, idx: number, val: string) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, options: q.options.map((o, i) => (i === idx ? val : o)) } : q)));
  const removeOption = (id: string, idx: number) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, options: q.options.filter((_, i) => i !== idx) } : q)));

  const toggleForm = () => {
    if (requiresForm) {
      setRequiresForm(false);
    } else {
      setRequiresForm(true);
      setFormOpen(true);
    }
  };

  const buildAndSubmit = async (form: Question[] | null) => {
    if (!title.trim()) {
      setStatus('Please add a title.');
      return;
    }
    setBusy(true);
    setStatus(null);
    const payload =
      kind === 'class'
        ? { title, description, date, time, durationHours, category, link: link.trim(), expert_title: expert.title }
        : kind === 'program'
        ? {
            title,
            description,
            weeks,
            sessions,
            cadence,
            price,
            notes: notes.trim(),
            requiresForm: !!form,
            signup_form: form,
          }
        : {
            title,
            description,
            tagline: tagline.trim(),
            price,
            durationMin: durationMin ? Number(durationMin) : null,
            online,
            inPerson,
            kind: isPackage ? 'package' : 'single',
            sessionsTotal: isPackage && sessionsTotal ? Number(sessionsTotal) : null,
            location: inPerson ? location.trim() : null,
            notes: notes.trim(),
          };
    const { error } = await submitNewOffering(expert.id, expert.name, kind, payload);
    setStatus(error ? `Could not submit: ${error.message}` : 'Submitted. Your new offering is pending admin approval.');
    setBusy(false);
  };

  const saveFormAndSubmit = () => {
    setFormMsg(null);
    const cleaned = questions
      .map((q) => ({ ...q, text: q.text.trim(), options: q.options.map((o) => o.trim()).filter(Boolean) }))
      .filter((q) => q.text.length > 0);
    if (cleaned.length === 0) {
      setFormMsg('Add at least one question.');
      return;
    }
    for (const q of cleaned) {
      if (q.type === 'choice' && q.options.length < 2) {
        setFormMsg(`"${q.text}" needs at least two options.`);
        return;
      }
    }
    setFormOpen(false);
    buildAndSubmit(cleaned);
  };

  const onMainSubmit = () => {
    if (mode === 'edit') { submitChange(); return; }
    if (kind === 'program' && requiresForm) setFormOpen(true);
    else buildAndSubmit(null);
  };

  return (
    <Wrap router={router}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.h1}>{mode === 'edit' ? 'Change an offering' : 'Propose an offering'}</Text>
          <Text style={styles.sub}>
            {mode === 'edit'
              ? 'Anything already booked keeps the price it was booked at. A change applies to new bookings only.'
              : 'Once approved by the team, it appears on the Sessions page.'}
          </Text>

          <View style={styles.segment}>
            {(['new', 'edit'] as const).map((m) => (
              <Pressable key={m} onPress={() => { setMode(m); setEditingId(null); setStatus(null); }} style={[styles.modeChip, mode === m && styles.modeChipOn]}>
                <Text style={[styles.modeText, mode === m && styles.modeTextOn]}>
                  {m === 'new' ? 'Something new' : 'Change one of mine'}
                </Text>
              </Pressable>
            ))}
          </View>

          {mode === 'edit' ? (
            mine.length === 0 ? (
              <Text style={styles.helper}>You do not have any live offerings yet.</Text>
            ) : (
              <>
                <Text style={styles.helper}>Pick the one you want to change.</Text>
                {mine.map((sv: any) => (
                  <Pressable key={sv.id} onPress={() => setEditingId(sv.id)} style={[styles.pickRow, editingId === sv.id && styles.pickRowOn]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickName}>{sv.name}</Text>
                      <Text style={styles.pickMeta}>
                        {sv.price || 'No price set'}
                        {sv.durationMin ? `  \u00B7  ${sv.durationMin} min` : ''}
                      </Text>
                    </View>
                    {editingId === sv.id ? <Ionicons name="checkmark-circle" size={20} color={COLORS.ink} /> : null}
                  </Pressable>
                ))}
              </>
            )
          ) : null}

          {mode === 'new' ? (
          <View style={styles.segment}>
            {(['class', 'program', 'session'] as const).map((k) => {
              const on = k === kind;
              return (
                <Pressable key={k} onPress={() => setKind(k)} style={[styles.segItem, on && styles.segItemOn]}>
                  <Text style={[styles.segText, on && styles.segTextOn]}>{k === 'class' ? 'Class' : k === 'program' ? 'Program' : 'Session'}</Text>
                </Pressable>
              );
            })}
          </View>

          ) : null}

          {mode !== 'new' ? null : kind === 'class' ? (
            <Text style={styles.helper}>Classes are webinars, one-time classes, or live online sessions.</Text>
          ) : kind === 'program' ? (
            <Text style={styles.helper}>Programs are multi-week journeys with several live sessions.</Text>
          ) : (
            <Text style={styles.helper}>Sessions are one-time offerings like consultations or single calls.</Text>
          )}

          <Field label="Title" value={title} onChangeText={setTitle} />
          <Field label="Description" value={description} onChangeText={setDescription} multiline />

          {mode === 'new' && kind === 'class' ? (
            <>
              <Field label="Date (e.g. Thu 10 Jul)" value={date} onChangeText={setDate} />
              <Field label="Time (e.g. 6:00 PM – 7:00 PM GST)" value={time} onChangeText={setTime} />
              <Field label="Duration in hours (e.g. 1.5)" value={durationHours} onChangeText={setDurationHours} keyboardType="decimal-pad" />
              <Field label="Category (e.g. Breathwork)" value={category} onChangeText={setCategory} />
              <Field
                label="Class link (Zoom, Google Meet, etc.)"
                value={link}
                onChangeText={setLink}
                keyboardType="url"
              />
              <Text style={styles.fieldHint}>This is shared with people who book, on their upcoming booking.</Text>
            </>
          ) : mode === 'new' && kind === 'program' ? (
            <>
              <Field label="Weeks (e.g. 6)" value={weeks} onChangeText={setWeeks} keyboardType="number-pad" />
              <Field label="Number of sessions (e.g. 6)" value={sessions} onChangeText={setSessions} keyboardType="number-pad" />
              <Field label="Cadence (e.g. Weekly, 60 min live)" value={cadence} onChangeText={setCadence} />
              <Field label="Price (e.g. AED 1,800)" value={price} onChangeText={setPrice} />
              <Field label="Notes for our team (anything you'd like us to adjust)" value={notes} onChangeText={setNotes} multiline />

              <Pressable style={styles.toggleRow} onPress={toggleForm}>
                <Text style={styles.toggleLabel}>Needs a sign-up form</Text>
                <View style={[styles.toggle, requiresForm && styles.toggleOn]}>
                  <View style={[styles.knob, requiresForm && styles.knobOn]} />
                </View>
              </Pressable>
              {requiresForm ? (
                <Pressable onPress={() => setFormOpen(true)} style={styles.editFormRow}>
                  <Ionicons name="create-outline" size={16} color={COLORS.accent} />
                  <Text style={styles.editFormText}>
                    {questions.filter((q) => q.text.trim()).length > 0
                      ? `Edit sign-up form (${questions.filter((q) => q.text.trim()).length} question${questions.filter((q) => q.text.trim()).length === 1 ? '' : 's'})`
                      : 'Build the sign-up form'}
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <>
              <Field label="Short line under the name (e.g. A first conversation)" value={tagline} onChangeText={setTagline} />
              <Field label="Price (e.g. AED 500)" value={price} onChangeText={setPrice} />
              <Field label="How long, in minutes (e.g. 60)" value={durationMin} onChangeText={setDurationMin} keyboardType="number-pad" />

              <Pressable style={styles.toggleRow} onPress={() => setOnline((v) => !v)}>
                <Text style={styles.toggleLabel}>Available online</Text>
                <View style={[styles.toggle, online && styles.toggleOn]}>
                  <View style={[styles.knob, online && styles.knobOn]} />
                </View>
              </Pressable>

              <Pressable style={styles.toggleRow} onPress={() => setInPerson((v) => !v)}>
                <Text style={styles.toggleLabel}>Available in person</Text>
                <View style={[styles.toggle, inPerson && styles.toggleOn]}>
                  <View style={[styles.knob, inPerson && styles.knobOn]} />
                </View>
              </Pressable>

              {inPerson ? (
                <Field label="Where it happens" value={location} onChangeText={setLocation} />
              ) : null}

              <Pressable style={styles.toggleRow} onPress={() => setIsPackage((v) => !v)}>
                <Text style={styles.toggleLabel}>Sold as a package</Text>
                <View style={[styles.toggle, isPackage && styles.toggleOn]}>
                  <View style={[styles.knob, isPackage && styles.knobOn]} />
                </View>
              </Pressable>

              {isPackage ? (
                <>
                  <Field label="How many sessions in the package" value={sessionsTotal} onChangeText={setSessionsTotal} keyboardType="number-pad" />
                  <Text style={styles.fieldHint}>The price above is for the whole package, not one session.</Text>
                </>
              ) : null}

              {!online && !inPerson ? (
                <Text style={styles.fieldHint}>Choose at least one of online or in person, or nobody can book it.</Text>
              ) : null}

              <Field label="Notes for our team (anything you'd like us to adjust)" value={notes} onChangeText={setNotes} multiline />
            </>
          )}

          <Pressable style={[styles.saveBtn, (busy || (mode === 'edit' && !editing)) && { opacity: 0.5 }]} onPress={onMainSubmit} disabled={busy || (mode === 'edit' && !editing)}>
            {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.saveText}>{mode === 'edit' ? 'Send the change for approval' : kind === 'program' && requiresForm ? 'Continue to sign-up form' : 'Submit for approval'}</Text>}
          </Pressable>
          {status ? <Text style={styles.status}>{status}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setFormOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Sign-up form</Text>
            <Text style={styles.sheetSub}>Build the questions people answer when they apply.</Text>
            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {questions.map((q, qi) => (
                <View key={q.id} style={styles.qCard}>
                  <View style={styles.qHead}>
                    <Text style={styles.qNum}>Question {qi + 1}</Text>
                    {questions.length > 1 ? (
                      <Pressable onPress={() => removeQ(q.id)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={16} color={COLORS.muted} />
                      </Pressable>
                    ) : null}
                  </View>
                  <TextInput
                    value={q.text}
                    onChangeText={(t) => updateQ(q.id, { text: t })}
                    placeholder="Your question"
                    placeholderTextColor={COLORS.muted}
                    style={styles.input}
                  />
                  <View style={styles.typeRow}>
                    {TYPES.map((t) => {
                      const on = t.key === q.type;
                      return (
                        <Pressable key={t.key} onPress={() => updateQ(q.id, { type: t.key })} style={[styles.typeChip, on && styles.typeChipOn]}>
                          <Text style={[styles.typeText, on && styles.typeTextOn]}>{t.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {q.type === 'choice' ? (
                    <View style={styles.optionsWrap}>
                      {q.options.map((opt, oi) => (
                        <View key={oi} style={styles.optionRow}>
                          <TextInput
                            value={opt}
                            onChangeText={(t) => setOption(q.id, oi, t)}
                            placeholder={`Option ${oi + 1}`}
                            placeholderTextColor={COLORS.muted}
                            style={[styles.input, { flex: 1 }]}
                          />
                          {q.options.length > 2 ? (
                            <Pressable onPress={() => removeOption(q.id, oi)} hitSlop={8} style={{ marginLeft: 8 }}>
                              <Ionicons name="close" size={18} color={COLORS.muted} />
                            </Pressable>
                          ) : null}
                        </View>
                      ))}
                      <Pressable onPress={() => addOption(q.id)} style={styles.addOption}>
                        <Ionicons name="add" size={16} color={COLORS.accent} />
                        <Text style={styles.addOptionText}>Add option</Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {q.type === 'yesno' ? <Text style={styles.previewHint}>People answer Yes or No.</Text> : null}
                  {q.type === 'short' ? <Text style={styles.previewHint}>People type a short answer.</Text> : null}
                  {q.type === 'long' ? <Text style={styles.previewHint}>People type a longer description.</Text> : null}
                </View>
              ))}

              <Pressable onPress={() => setQuestions((qs) => [...qs, newQuestion()])} style={styles.addQ}>
                <Ionicons name="add-circle-outline" size={18} color={COLORS.accent} />
                <Text style={styles.addQText}>Add question</Text>
              </Pressable>
            </ScrollView>

            {formMsg ? <Text style={styles.formMsg}>{formMsg}</Text> : null}
            <Pressable style={styles.saveBtn} onPress={saveFormAndSubmit}>
              <Text style={styles.saveText}>Save form & submit</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
        autoCapitalize={keyboardType === 'url' ? 'none' : 'sentences'}
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
  segment: { flexDirection: 'row', backgroundColor: COLORS.accentSoft, borderRadius: 999, padding: 4, marginBottom: 12 },
  segItem: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  segItemOn: { backgroundColor: COLORS.ink },
  segText: { fontSize: 14, color: COLORS.ink },
  segTextOn: { color: COLORS.bg },
  helper: { fontSize: 13, lineHeight: 19, color: COLORS.muted, marginBottom: 18 },
  modeChip: { flex: 1, paddingVertical: 11, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center' },
  modeChipOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  modeText: { fontSize: 13, color: COLORS.ink },
  modeTextOn: { color: COLORS.bg },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 14, marginBottom: 8 },
  pickRowOn: { borderColor: COLORS.ink },
  pickName: { fontFamily: FONT_SERIF, fontSize: 15, color: COLORS.ink },
  pickMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  fieldHint: { fontSize: 12, lineHeight: 17, color: COLORS.muted, marginTop: -8, marginBottom: 16 },
  input: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: COLORS.ink },
  inputMulti: { minHeight: 90, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, marginBottom: 6 },
  toggleLabel: { fontSize: 15, color: COLORS.ink },
  toggle: { width: 50, height: 30, borderRadius: 999, backgroundColor: COLORS.line, padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: COLORS.accent },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.bg },
  knobOn: { alignSelf: 'flex-end' },
  editFormRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, marginBottom: 6 },
  editFormText: { fontSize: 14, color: COLORS.accent },
  saveBtn: { marginTop: 18, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.taupeBlue, alignItems: 'center' },
  saveText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  status: { fontSize: 14, lineHeight: 20, color: COLORS.ink, marginTop: 14, textAlign: 'center' },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.35)' },
  sheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 14 },
  sheetTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink },
  sheetSub: { fontSize: 13, color: COLORS.muted, marginTop: 4, marginBottom: 14 },
  qCard: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 14, marginBottom: 12 },
  qHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  qNum: { fontSize: 12, letterSpacing: 1, color: COLORS.muted },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  typeChip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line },
  typeChipOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  typeText: { fontSize: 12, color: COLORS.ink },
  typeTextOn: { color: COLORS.bg },
  optionsWrap: { marginTop: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  addOption: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  addOptionText: { fontSize: 13, color: COLORS.accent },
  previewHint: { fontSize: 12, color: COLORS.muted, marginTop: 10 },
  addQ: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, justifyContent: 'center' },
  addQText: { fontSize: 14, color: COLORS.accent },
  formMsg: { fontSize: 13, color: '#9B5A4A', marginTop: 10, textAlign: 'center' },
});

