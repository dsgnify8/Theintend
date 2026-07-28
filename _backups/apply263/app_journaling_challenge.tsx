import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { CHALLENGE_TITLE, CHALLENGE_PROMPTS } from '@/constants/journal';
import { getChallenge, saveChallengeDay, type ChallengeData } from '@/lib/journal';

const TOTAL = CHALLENGE_PROMPTS.length;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ChallengeScreen() {
  const router = useRouter();
  const [data, setData] = useState<ChallengeData>({});
  const [day, setDay] = useState(1);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getChallenge().then((d) => {
      setData(d);
      let start = 1;
      for (let i = 1; i <= TOTAL; i++) {
        if (!(d[String(i)]?.text ?? '').trim()) { start = i; break; }
        if (i === TOTAL) start = i;
      }
      setDay(start);
      setText(d[String(start)]?.text ?? '');
      setLoading(false);
    });
  }, []);

  // Autosave the current day as you type.
  useEffect(() => {
    if (loading) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveChallengeDay(day, text);
      setData((prev) => ({ ...prev, [String(day)]: { text, updatedAt: new Date().toISOString() } }));
      setSaved(true);
    }, 600);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const goTo = async (target: number) => {
    if (target < 1 || target > TOTAL || target === day) return;
    if ((data[String(day)]?.text ?? '') !== text) {
      await saveChallengeDay(day, text);
      setData((prev) => ({ ...prev, [String(day)]: { text, updatedAt: new Date().toISOString() } }));
    }
    setDay(target);
    setText(data[String(target)]?.text ?? '');
    setSaved(false);
  };

  const current = data[String(day)];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Journal</Text>
      </Pressable>

      {loading ? (
        <View style={styles.loaderBox}><ActivityIndicator color={COLORS.accent} /></View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
          <View style={styles.header}>
            <Text style={styles.kicker}>{CHALLENGE_TITLE.toUpperCase()}</Text>
            <Text style={styles.h1}>Day {day} of {TOTAL}</Text>
          </View>

          <View style={styles.stripWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
              {Array.from({ length: TOTAL }, (_, i) => i + 1).map((n) => {
                const on = n === day;
                const written = (data[String(n)]?.text ?? '').trim().length > 0;
                return (
                  <Pressable key={n} onPress={() => goTo(n)} style={[styles.dayPill, on && styles.dayPillOn, written && !on && styles.dayPillDone]}>
                    <Text style={[styles.dayPillText, on && styles.dayPillTextOn, written && !on && styles.dayPillTextDone]}>{n}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.paper}>
              <Text style={styles.prompt}>{CHALLENGE_PROMPTS[day - 1]}</Text>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={(t) => { setText(t); setSaved(false); }}
                placeholder="Write here"
                placeholderTextColor={COLORS.muted}
                multiline
                textAlignVertical="top"
              />
            </View>

            <Text style={styles.autosaveNote}>{saved ? 'Saved' : 'Your writing saves automatically'}{current?.updatedAt ? `  ·  last written ${fmtDate(current.updatedAt)}` : ''}</Text>

            <View style={styles.navRow}>
              <Pressable style={[styles.navBtn, day <= 1 && styles.btnOff]} disabled={day <= 1} onPress={() => goTo(day - 1)}>
                <Ionicons name="chevron-back" size={18} color={COLORS.ink} />
                <Text style={styles.navText}>Previous</Text>
              </Pressable>
              <Pressable style={[styles.navBtn, day >= TOTAL && styles.btnOff]} disabled={day >= TOTAL} onPress={() => goTo(day + 1)}>
                <Text style={styles.navText}>Next day</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.ink} />
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  loaderBox: { paddingVertical: 40, alignItems: 'center' },
  header: { paddingHorizontal: 20, marginTop: 4 },
  kicker: { fontSize: 12, letterSpacing: 2.5, color: COLORS.muted },
  h1: { fontFamily: FONT_SERIF, fontSize: 26, color: COLORS.ink, marginTop: 8 },
  stripWrap: { marginTop: 16, marginBottom: 4 },
  strip: { gap: 8, paddingHorizontal: 20, paddingVertical: 4 },
  dayPill: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  dayPillOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  dayPillDone: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accentSoft },
  dayPillText: { fontSize: 14, color: COLORS.muted },
  dayPillTextOn: { color: COLORS.bg },
  dayPillTextDone: { color: COLORS.accent },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 60 },
  paper: { backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, padding: 20 },
  prompt: { fontFamily: FONT_SERIF, fontSize: 20, lineHeight: 28, color: COLORS.ink, marginBottom: 14 },
  input: { fontSize: 16, lineHeight: 26, color: COLORS.ink, minHeight: 180, paddingVertical: 4 },
  autosaveNote: { fontSize: 13, color: COLORS.muted, marginTop: 14 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card },
  navText: { fontSize: 14, color: COLORS.ink },
  btnOff: { opacity: 0.4 },
});
