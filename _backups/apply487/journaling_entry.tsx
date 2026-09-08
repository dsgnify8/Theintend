import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { getCategory } from '@/constants/journal';
import { getEntry, updateEntry, deleteEntry, type JournalEntry } from '@/lib/journal';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}

export default function EntryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getEntry(String(id)).then((e) => {
      setEntry(e);
      setAnswers(e ? e.items.map((it) => it.answer) : []);
      setLoading(false);
    });
  }, [id]);

  // Autosave edits.
  useEffect(() => {
    if (!entry) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const items = entry.items.map((it, i) => ({ prompt: it.prompt, answer: answers[i] ?? '' }));
      updateEntry(entry.id, items).then(() => setSaved(true));
    }, 600);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  const cat = entry ? getCategory(entry.categoryId) : null;

  const remove = () => {
    if (!entry) return;
    Alert.alert('Delete this entry?', 'This page will be removed for good.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteEntry(entry.id); router.back(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        {entry ? (
          <Pressable onPress={remove} hitSlop={10}>
            <Ionicons name="trash-outline" size={20} color={COLORS.muted} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loaderBox}><ActivityIndicator color={COLORS.accent} /></View>
      ) : !entry ? (
        <Text style={styles.note}>This entry could not be found.</Text>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.kicker}>{(cat?.title ?? 'JOURNAL').toUpperCase()}</Text>
            <Text style={styles.h1}>{fmtDate(entry.createdAt)}</Text>
            <Text style={styles.today}>{saved ? 'Saved' : 'Your writing saves automatically'}</Text>

            <View style={styles.paper}>
              {entry.items.map((it, i) => (
                <View key={i} style={styles.block}>
                  <Text style={styles.prompt}>{it.prompt}</Text>
                  <TextInput
                    style={styles.input}
                    value={answers[i]}
                    onChangeText={(t) => setAnswers((prev) => { const n = [...prev]; n[i] = t; setSaved(false); return n; })}
                    placeholder="Write here"
                    placeholderTextColor={COLORS.muted}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, paddingRight: 20 },
  backBar: { flexDirection: 'row', alignItems: 'center' },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  loaderBox: { paddingVertical: 40, alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  kicker: { fontSize: 12, letterSpacing: 2.5, color: COLORS.muted, marginTop: 4 },
  h1: { fontFamily: FONT_SERIF, fontSize: 26, color: COLORS.ink, marginTop: 8 },
  today: { fontSize: 13, color: COLORS.accent, marginTop: 8 },
  paper: { backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 4, marginTop: 18 },
  block: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  prompt: { fontFamily: FONT_SERIF, fontSize: 17, lineHeight: 24, color: COLORS.ink, marginBottom: 10 },
  input: { fontSize: 16, lineHeight: 26, color: COLORS.ink, minHeight: 52, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  note: { fontSize: 14, lineHeight: 21, color: COLORS.muted, paddingHorizontal: 20 },
});
