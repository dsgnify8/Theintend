import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSessions } from '@/lib/sessions';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { createBooking } from '@/lib/bookings';
import { useAuth } from '@/lib/auth';
import { payWithSheet, priceToMinorUnits } from '@/lib/payments';
import { payWithTabby, priceToMajorString, tabbyInstallment } from '@/lib/tabby';
import { TABBY_ENABLED } from '@/constants/stripe';
import { TabbyLogo } from '@/components/TabbyLogo';

type Step = 'closed' | 'form' | 'done';

export default function ProgramDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { programs: PROGRAMS } = useSessions();
  const item = PROGRAMS.find((p) => p.id === id);
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('closed');
  const [saving, setSaving] = useState(false);

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
    createBooking({
      refId: item.id,
      expertId: item.expertId,
      kind: 'program',
      title: item.title,
      when: `${item.weeks} weeks \u00B7 ${item.cadence}`,
      expert: item.expertName,
    });
    setStep('done');
  };

  const askForPhone = (msg?: string) => {
    Alert.alert(
      'Add your number',
      msg || 'Add your phone number in Personal information to pay with Tabby.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Add number', onPress: () => router.push('/personal-info') },
      ]
    );
  };

  const startPay = async () => {
    if (!user) { router.push('/login'); return; }
    const amount = priceToMinorUnits(item.price);
    if (amount <= 0) { item.requiresForm ? setStep('form') : finalize(); return; }
    setSaving(true);
    const res = await payWithSheet({ amount, label: item.title });
    setSaving(false);
    if (res.ok) {
      if (item.requiresForm) setStep('form');
      else finalize();
    } else if (res.error && res.error !== 'canceled') {
      Alert.alert('Payment', res.error);
    }
  };

  const startTabby = async () => {
    if (!user) { router.push('/login'); return; }
    if (priceToMinorUnits(item.price) <= 0) { item.requiresForm ? setStep('form') : finalize(); return; }
    setSaving(true);
    const res = await payWithTabby({ amount: priceToMajorString(item.price), label: item.title });
    setSaving(false);
    if (res.ok) {
      if (item.requiresForm) setStep('form');
      else finalize();
    } else if (res.code === 'phone_required') {
      askForPhone(res.error);
    } else if (res.error && res.error !== 'canceled') {
      Alert.alert('Tabby', res.error);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackBar onPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.metaRow}>
          <Text style={styles.pill}>{item.weeks} weeks</Text>
          <Text style={styles.pill}>{item.sessions} sessions</Text>
          <Text style={styles.pill}>{item.cadence}</Text>
        </View>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.price}>{item.price}</Text>
        {TABBY_ENABLED && priceToMinorUnits(item.price) > 0 ? (
          <Text style={styles.tabbyLine}>or 4 interest-free payments of {tabbyInstallment(item.price)} with Tabby</Text>
        ) : null}

        <Text style={styles.sectionTitle}>About this program</Text>
        <Text style={styles.body}>{item.description}</Text>

        <Text style={styles.sectionTitle}>About the expert</Text>
        <Pressable style={styles.expertRow} onPress={() => router.push(`/expert/${item.expertId}`)}>
          <Text style={styles.expertName}>{item.expertName}</Text>
          <Ionicons name="person-circle-outline" size={22} color={COLORS.muted} />
        </Pressable>

        <Pressable style={[styles.enrollBtn, saving && styles.enrollOff]} disabled={saving} onPress={startPay}>
          {saving ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.enrollText}>Enroll \u00B7 {item.price}</Text>}
        </Pressable>
      </ScrollView>

      <Modal visible={step !== 'closed'} transparent animationType="slide" onRequestClose={() => setStep('closed')}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setStep('closed')} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
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
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 12 },
  pill: { fontSize: 12, color: COLORS.ink, backgroundColor: COLORS.accentSoft, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, overflow: 'hidden' },
  title: { fontFamily: FONT_SERIF, fontSize: 26, lineHeight: 32, color: COLORS.ink },
  price: { fontSize: 16, color: COLORS.accent, marginTop: 8 },
  sectionTitle: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginTop: 28, marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 24, color: COLORS.ink, opacity: 0.88 },
  expertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16 },
  expertName: { fontFamily: FONT_SERIF, fontSize: 17, color: COLORS.ink },
  enrollBtn: { marginTop: 28, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.taupeBlue, alignItems: 'center' },
  enrollOff: { opacity: 0.6 },
  enrollText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  tabbyLine: { fontSize: 13, color: COLORS.muted, marginTop: 8 },
  tabbyLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, marginTop: 6 },
  tabbyLinkText: { color: COLORS.ink, fontSize: 14 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.35)' },
  sheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 36, maxHeight: '85%' },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 16 },
  sheetTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink },
  sheetSub: { fontSize: 14, color: COLORS.muted, marginTop: 6, marginBottom: 18 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  input: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: COLORS.ink },
  inputMulti: { height: 90, textAlignVertical: 'top' },
  primaryBtn: { marginTop: 18, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.taupeBlue, alignItems: 'center' },
  primaryText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  doneWrap: { alignItems: 'center', paddingVertical: 12 },
  doneTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginTop: 12, marginBottom: 8 },
  doneText: { fontSize: 14, lineHeight: 21, color: COLORS.muted, textAlign: 'center' },
  missing: { padding: 24, fontSize: 15, color: COLORS.muted },
});
