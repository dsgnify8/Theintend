import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { getCategory, promptsForToday } from '@/constants/journal';
import { createEntry, useCategoryEntries, getJournalDraft, saveJournalDraft, clearJournalDraft, type JournalItem } from '@/lib/journal';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}

export default function CategoryScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const cat = getCategory(String(category));
  const prompts = cat ? promptsForToday(cat) : [];
  const { entries } = useCategoryEntries(String(category));
  const [answers, setAnswers] = useState<string[]>(() => prompts.map(() => ''));
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore any autosaved draft, aligned to today's prompts by their text.
  useEffect(() => {
    if (!cat) { setLoaded(true); return; }
    getJournalDraft(cat.id).then((map) => {
      setAnswers(prompts.map((p) => map[p] ?? ''));
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat?.id]);

  // Autosave as you type.
  useEffect(() => {
    if (!loaded || !cat) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const map: Record<string, string> = {};
      prompts.forEach((p, i) => { map[p] = answers[i] ?? ''; });
      saveJournalDraft(cat.id, map);
    }, 500);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, loaded]);

  if (!cat) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.note}>This journal could not be found.</Text>
      </SafeAreaView>
    );
  }

  const hasWriting = answers.some((a) => a.trim().length > 0);

  const save = async () => {
    if (!hasWriting) return;
    setSaving(true);
    const items: JournalItem[] = prompts.map((p, i) => ({ prompt: p, answer: answers[i] ?? '' }));
    await createEntry(cat.id, items);
    await clearJournalDraft(cat.id);
    setAnswers(prompts.map(() => ''));
    setSaving(false);
    setJustSaved(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Journal</Text>
      </Pressable>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>{cat.title.toUpperCase()}</Text>
          <Text style={styles.h1}>{cat.subtitle}</Text>
          <Text style={styles.today}>{fmtDate(new Date().toISOString())}</Text>

          <View style={styles.paper}>
            {prompts.map((p, i) => (
              <View key={i} style={styles.block}>
                <Text style={styles.prompt}>{p}</Text>
                <TextInput
                  style={styles.input}
                  value={answers[i]}
                  onChangeText={(t) => setAnswers((prev) => { const n = [...prev]; n[i] = t; setJustSaved(false); return n; })}
                  placeholder="Write here"
                  placeholderTextColor={COLORS.muted}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            ))}
          </View>

          <Text style={styles.autosaveNote}>Your writing saves automatically. Keep a finished page by filing it below, dated, so you can look back on it.</Text>
          {justSaved ? <Text style={styles.savedNote}>Filed to your past entries below. This page is fresh again.</Text> : null}
          <Pressable style={[styles.saveBtn, (!hasWriting || saving) && styles.btnOff]} disabled={!hasWriting || saving} onPress={save}>
            {saving ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.saveText}>Save this page to my journal</Text>}
          </Pressable>

          <Text style={styles.pastLabel}>Your past entries</Text>
          {entries.length === 0 ? (
            <Text style={styles.note}>Nothing here yet. Each page you file appears here with its own date.</Text>
          ) : (
            entries.map((e) => {
              const written = e.items.filter((it) => it.answer.trim().length > 0).length;
              return (
                <Pressable key={e.id} style={styles.entryRow} onPress={() => router.push(`/journaling/entry/${e.id}`)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entryDate}>{fmtDate(e.createdAt)}</Text>
                    <Text style={styles.entryMeta}>{written} of {e.items.length} prompts written</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  kicker: { fontSize: 12, letterSpacing: 2.5, color: COLORS.muted, marginTop: 4 },
  h1: { fontFamily: FONT_SERIF, fontSize: 26, lineHeight: 32, color: COLORS.ink, marginTop: 8 },
  today: { fontSize: 13, color: COLORS.accent, marginTop: 8, marginBottom: 20 },
  paper: { backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 4 },
  block: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  prompt: { fontFamily: FONT_SERIF, fontSize: 17, lineHeight: 24, color: COLORS.ink, marginBottom: 10 },
  input: { fontSize: 16, lineHeight: 26, color: COLORS.ink, minHeight: 52, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  autosaveNote: { fontSize: 13, lineHeight: 20, color: COLORS.muted, marginTop: 16 },
  savedNote: { fontSize: 13, color: COLORS.accent, marginTop: 8 },
  saveBtn: { marginTop: 14, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.accent, alignItems: 'center' },
  btnOff: { opacity: 0.5 },
  saveText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  pastLabel: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginTop: 34, marginBottom: 12 },
  note: { fontSize: 14, lineHeight: 21, color: COLORS.muted },
  entryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 10 },
  entryDate: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  entryMeta: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
});
