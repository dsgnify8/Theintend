import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import {
  STATES,
  STATE_TO_CATEGORY,
  saveAffProfile,
  generateBatch,
} from '@/lib/affirmations';

const APP_LOGO = require('../../assets/images/icon.png');

const FOCUS = [
  { id: 'self-love', label: 'Self-love' },
  { id: 'confidence', label: 'Confidence' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'family', label: 'Family' },
  { id: 'focus', label: 'Focus & clarity' },
  { id: 'abundance', label: 'Abundance & money' },
  { id: 'calm', label: 'Calm & anxiety' },
  { id: 'letting-go', label: 'Letting go' },
  { id: 'health', label: 'Health & body' },
  { id: 'purpose', label: 'Purpose & growth' },
];

type Step = 'welcome' | 'focus' | 'state' | 'notify' | 'generating';

export default function AffirmationsOnboarding() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [focus, setFocus] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [context, setContext] = useState('');
  const [notify, setNotify] = useState(true);

  const toggleFocus = (id: string) =>
    setFocus((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const toggleState = (id: string) =>
    setStates((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

  const finish = async () => {
    if (!user) { router.replace('/login'); return; }
    setStep('generating');
    const primaryState = states[0] ?? '';
    const category = STATE_TO_CATEGORY[primaryState] ?? focus[0] ?? 'self-love';
    await saveAffProfile(user.id, {
      focus_areas: focus,
      context: context.trim() || null,
      state: states[0] ?? null,
      states,
      notify,
      notify_hour: notify ? 8 : null,
    });
    await generateBatch(category, 30);
    router.replace(`/affirmations/scroll?category=${category}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {step !== 'welcome' && step !== 'generating' ? (
        <Pressable
          style={styles.back}
          hitSlop={12}
          onPress={() => setStep(step === 'focus' ? 'welcome' : step === 'state' ? 'focus' : 'state')}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </Pressable>
      ) : null}

      {step === 'welcome' ? (
        <View style={styles.center}>
          <Text style={styles.h1}>Welcome to I Am</Text>
          <Text style={styles.welcomeBody}>
            A daily practice of speaking to yourself with belief. Repeat them, return to them, and let
            them remind you who you are becoming.
          </Text>
          <Pressable style={[styles.cta, styles.ctaWide]} onPress={() => setStep('focus')}>
            <Text style={styles.ctaText}>Get started</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 'focus' ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>STEP 1 OF 3</Text>
          <Text style={styles.h2}>What are you reaching for?</Text>
          <Text style={styles.sub}>Choose as many as feel true. This shapes your affirmations.</Text>
          <View style={styles.wrap}>
            {FOCUS.map((f) => {
              const on = focus.includes(f.id);
              return (
                <Pressable key={f.id} onPress={() => toggleFocus(f.id)} style={[styles.pill, on && styles.pillOn]}>
                  <Text style={[styles.pillText, on && styles.pillTextOn]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable style={[styles.cta, focus.length === 0 && styles.ctaOff]} disabled={focus.length === 0} onPress={() => setStep('state')}>
            <Text style={styles.ctaText}>Continue</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      {step === 'state' ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>STEP 2 OF 3</Text>
          <Text style={styles.h2}>Where are you right now?</Text>
          <Text style={styles.sub}>Pick any that fit. They set the voice of your affirmations.</Text>
          <View style={{ marginTop: 6 }}>
            {STATES.map((st) => {
              const on = states.includes(st.id);
              return (
                <Pressable key={st.id} onPress={() => toggleState(st.id)} style={[styles.stateRow, on && styles.stateRowOn]}>
                  <Text style={[styles.stateText, on && styles.stateTextOn]}>{st.label}</Text>
                  {on ? <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} /> : null}
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.fieldLabel}>In your own words, what do you want to feel or become?</Text>
          <TextInput
            value={context}
            onChangeText={setContext}
            placeholder="Optional, but it makes them yours"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            multiline
          />
          <Pressable style={[styles.cta, states.length === 0 && styles.ctaOff]} disabled={states.length === 0} onPress={() => setStep('notify')}>
            <Text style={styles.ctaText}>Continue</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      {step === 'notify' ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>STEP 3 OF 3</Text>
          <Text style={styles.h2}>A gentle daily reminder</Text>
          <Text style={styles.sub}>One affirmation each morning, so it finds you when you need it.</Text>

          <View style={styles.notifPreview}>
            <Image source={APP_LOGO} style={styles.notifLogo} />
            <View style={{ flex: 1 }}>
              <View style={styles.notifTop}>
                <Text style={styles.notifApp}>I am</Text>
                <Text style={styles.notifNow}>now</Text>
              </View>
              <Text style={styles.notifBody}>I am worthy of the life I am building.</Text>
            </View>
          </View>

          <Pressable style={styles.toggleRow} onPress={() => setNotify((n) => !n)}>
            <Text style={styles.toggleLabel}>Send me a daily affirmation</Text>
            <View style={[styles.toggle, notify && styles.toggleOn]}>
              <View style={[styles.knob, notify && styles.knobOn]} />
            </View>
          </Pressable>

          <Pressable style={styles.cta} onPress={finish}>
            <Text style={styles.ctaText}>{notify ? 'Turn on and begin' : 'Begin'}</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      {step === 'generating' ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text style={styles.genTitle}>Writing your affirmations</Text>
          <Text style={styles.genSub}>Shaped by what you told us. This takes a moment.</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  back: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 4, alignSelf: 'flex-start' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  content: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 40 },

  mark: { width: 96, height: 96, borderRadius: 26, borderWidth: 1.5, borderColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 30, transform: [{ rotate: '-4deg' }] },
  markText: { fontFamily: FONT_SERIF, fontSize: 26, letterSpacing: 2, color: COLORS.accent },
  h1: { fontFamily: FONT_SERIF, fontSize: 30, color: COLORS.ink, textAlign: 'center' },
  welcomeBody: { fontSize: 15, lineHeight: 23, color: COLORS.muted, textAlign: 'center', marginTop: 14 },

  kicker: { fontSize: 12, letterSpacing: 2.5, color: COLORS.muted, marginBottom: 10, marginTop: 4 },
  h2: { fontFamily: FONT_SERIF, fontSize: 27, lineHeight: 33, color: COLORS.ink },
  sub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginTop: 8, marginBottom: 20 },

  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: { paddingVertical: 11, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card },
  pillOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  pillText: { fontSize: 14, color: COLORS.ink },
  pillTextOn: { color: COLORS.bg },

  stateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card, marginBottom: 10 },
  stateRowOn: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  stateText: { fontSize: 15, color: COLORS.ink, flex: 1 },
  stateTextOn: { color: COLORS.ink },

  fieldLabel: { fontSize: 14, color: COLORS.ink, marginTop: 22, marginBottom: 10 },
  input: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 14, fontSize: 15, color: COLORS.ink, minHeight: 84, textAlignVertical: 'top' },

  notifPreview: { flexDirection: 'row', gap: 12, backgroundColor: '#EDE7DF', borderRadius: 20, padding: 15, marginBottom: 26, shadowColor: '#2B2622', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  notifLogo: { width: 42, height: 42, borderRadius: 10 },
  notifTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifApp: { fontSize: 14, color: COLORS.ink, fontWeight: '600' },
  notifNow: { fontSize: 12, color: COLORS.muted },
  notifBody: { fontSize: 15, lineHeight: 20, color: COLORS.ink, marginTop: 3 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, marginBottom: 26 },
  toggleLabel: { fontSize: 15, color: COLORS.ink },
  toggle: { width: 52, height: 30, borderRadius: 999, backgroundColor: COLORS.line, padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: COLORS.accent },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF' },
  knobOn: { alignSelf: 'flex-end' },

  cta: { backgroundColor: COLORS.taupeBlue, borderRadius: 999, paddingVertical: 18, paddingHorizontal: 40, alignItems: 'center', marginTop: 26 },
  ctaWide: { alignSelf: 'stretch', marginHorizontal: 8 },
  ctaOff: { opacity: 0.5 },
  ctaText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },

  genTitle: { fontFamily: FONT_SERIF, fontSize: 23, color: COLORS.ink, marginTop: 24 },
  genSub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, textAlign: 'center', marginTop: 8 },
});

