import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSessions } from '@/lib/sessions';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { addBooking } from '@/lib/store';

type Step = 'closed' | 'pay' | 'form' | 'done';

export default function ProgramDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { programs: PROGRAMS } = useSessions();
  const item = PROGRAMS.find((p) => p.id === id);
  const [step, setStep] = useState<Step>('closed');

  if (!item) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackBar onPress={() => router.back()} />
        <Text style={styles.missing}>Program not found.</Text>
      </SafeAreaView>
    );
  }

  const finalize = () => {
    addBooking({
      refId: item.id,
      kind: 'program',
      title: item.title,
      when: `${item.weeks} weeks · ${item.cadence}`,
      expert: item.expertName,
    });
    setStep('done');
  };

  const onPay = () => {
    if (item.requiresForm) setStep('form');
    else finalize();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackBar onPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.cover, { backgroundColor: item.color }]}>
          <Text style={styles.coverTitle}>{item.title}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.pill}>{item.weeks} weeks</Text>
          <Text style={styles.pill}>{item.sessions} sessions</Text>
          <Text style={styles.pill}>{item.cadence}</Text>
        </View>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.price}>{item.price}</Text>

        <Text style={styles.sectionTitle}>About this program</Text>
        <Text style={styles.body}>{item.description}</Text>

        <Text style={styles.sectionTitle}>About the expert</Text>
        <Pressable style={styles.expertRow} onPress={() => router.push(`/expert/${item.expertId}`)}>
          <Text style={styles.expertName}>{item.expertName}</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
        </Pressable>

        <Pressable style={styles.enrollBtn} onPress={() => setStep('pay')}>
          <Text style={styles.enrollText}>Enroll · {item.price}</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={step !== 'closed'} transparent animationType="slide" onRequestClose={() => setStep('closed')}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setStep('closed')} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {step === 'pay' ? (
                <View>
                  <Text style={styles.sheetTitle}>Checkout</Text>
                  <Text style={styles.sheetSub}>{item.title} · {item.price}</Text>
                  <Field label="Name on card" placeholder="Full name" />
                  <Field label="Card number" placeholder="1234 5678 9012 3456" keyboardType="number-pad" />
                  <View style={styles.fieldRow}>
                    <View style={{ flex: 1, marginRight: 10 }}><Field label="Expiry" placeholder="MM/YY" /></View>
                    <View style={{ flex: 1 }}><Field label="CVC" placeholder="123" keyboardType="number-pad" /></View>
                  </View>
                  <Text style={styles.payNote}>Secure payment with Tabby connects later. This is a preview.</Text>
                  <Pressable style={styles.primaryBtn} onPress={onPay}>
                    <Text style={styles.primaryText}>Pay {item.price}</Text>
                  </Pressable>
                </View>
              ) : null}

              {step === 'form' ? (
                <View>
                  <Text style={styles.sheetTitle}>A few details</Text>
                  <Text style={styles.sheetSub}>This program needs a short sign-up form.</Text>
                  <Field label="Full name" placeholder="Your name" />
                  <Field label="Email" placeholder="you@email.com" keyboardType="email-address" />
                  <Field label="Phone" placeholder="+971 ..." keyboardType="phone-pad" />
                  <Field label="What brings you here?" placeholder="A sentence or two" multiline />
                  <Pressable style={styles.primaryBtn} onPress={finalize}>
                    <Text style={styles.primaryText}>Complete registration</Text>
                  </Pressable>
                </View>
              ) : null}

              {step === 'done' ? (
                <View style={styles.doneWrap}>
                  <Ionicons name="checkmark-circle" size={40} color={COLORS.accent} />
                  <Text style={styles.doneTitle}>You're enrolled</Text>
                  <Text style={styles.doneText}>
                    {item.title} is now under Bookings in You, and shows on your Home as upcoming.
                  </Text>
                  <Pressable style={styles.primaryBtn} onPress={() => setStep('closed')}>
                    <Text style={styles.primaryText}>Done</Text>
                  </Pressable>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, placeholder, keyboardType, multiline }: { label: string; placeholder: string; keyboardType?: any; multiline?: boolean }) {
  const [val, setVal] = useState('');
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={val}
        onChangeText={setVal}
        placeholder={placeholder}
        placeholderTextColor={COLORS.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMulti]}
      />
    </View>
  );
}

function BackBar({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.backBar} onPress={onPress} hitSlop={10}>
      <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
      <Text style={styles.backText}>Sessions</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  cover: { height: 180, borderRadius: 20, padding: 20, justifyContent: 'flex-end', marginBottom: 18 },
  coverTitle: { fontFamily: FONT_SERIF, fontSize: 30, lineHeight: 34, color: '#FFFFFF' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pill: { fontSize: 12, color: COLORS.ink, backgroundColor: COLORS.accentSoft, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, overflow: 'hidden' },
  title: { fontFamily: FONT_SERIF, fontSize: 26, lineHeight: 32, color: COLORS.ink },
  price: { fontSize: 16, color: COLORS.accent, marginTop: 8 },
  sectionTitle: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginTop: 28, marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 24, color: COLORS.ink, opacity: 0.88 },
  expertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16 },
  expertName: { fontFamily: FONT_SERIF, fontSize: 17, color: COLORS.ink },
  enrollBtn: { marginTop: 28, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.accent, alignItems: 'center' },
  enrollText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.35)' },
  sheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 36, maxHeight: '85%' },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 16 },
  sheetTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink },
  sheetSub: { fontSize: 14, color: COLORS.muted, marginTop: 6, marginBottom: 18 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  fieldRow: { flexDirection: 'row' },
  input: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: COLORS.ink },
  inputMulti: { height: 90, textAlignVertical: 'top' },
  payNote: { fontSize: 12, color: COLORS.muted, marginTop: 8, marginBottom: 4 },
  primaryBtn: { marginTop: 18, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.accent, alignItems: 'center' },
  primaryText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  doneWrap: { alignItems: 'center', paddingVertical: 12 },
  doneTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginTop: 12, marginBottom: 8 },
  doneText: { fontSize: 14, lineHeight: 21, color: COLORS.muted, textAlign: 'center' },
  missing: { padding: 24, fontSize: 15, color: COLORS.muted },
});
