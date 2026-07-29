// Reusable payment sheet (preview). Records the intent to pay and, optionally,
// remembers a card for next time. No real charge happens yet; wiring a processor
// (Stripe or Tabby) is a later native step.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { COLORS, FONT_SERIF } from '@/constants/brand';

type Saved = { brand: string; last4: string } | null;

function brandFromNumber(num: string): string {
  const n = num.replace(/\s/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^5[1-5]/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  return 'Card';
}
function formatCardNumber(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + '/' + digits.slice(2);
}

export function PaymentSheet({ visible, amount, onClose, onPaid }: {
  visible: boolean;
  amount: string;
  onClose: () => void;
  onPaid: () => void | Promise<void>;
}) {
  const [saved, setSaved] = useState<Saved>(null);
  const [useSaved, setUseSaved] = useState(true);
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [save, setSave] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPaying(false);
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        if (!uid) { setSaved(null); return; }
        const { data } = await supabase.from('profiles').select('pay_brand, pay_last4').eq('id', uid).maybeSingle();
        if (data?.pay_last4) { setSaved({ brand: data.pay_brand ?? 'Card', last4: data.pay_last4 }); setUseSaved(true); }
        else { setSaved(null); setUseSaved(false); }
      } catch { setSaved(null); }
    })();
  }, [visible]);

  const cardValid = number.replace(/\D/g, '').length >= 15 && expiry.length >= 4 && cvc.length >= 3;
  const usingSaved = !!(saved && useSaved);
  const canPay = usingSaved || cardValid;
  const payLabel = amount ? `Pay ${amount}` : 'Pay';

  const finish = async () => {
    try { await onPaid(); } finally { setPaying(false); }
  };

  const payCard = async () => {
    if (paying || !canPay) return;
    setPaying(true);
    if (!usingSaved && save) {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        if (uid) {
          const digits = number.replace(/\D/g, '');
          await supabase.from('profiles').update({ pay_brand: brandFromNumber(number), pay_last4: digits.slice(-4) }).eq('id', uid);
        }
      } catch {}
    }
    await finish();
  };

  const payApple = async () => {
    if (paying) return;
    setPaying(true);
    await finish();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headRow}>
            <Text style={styles.title}>Payment</Text>
            {amount ? <Text style={styles.amount}>{amount}</Text> : null}
          </View>

          <Pressable style={[styles.appleBtn, paying && styles.off]} onPress={payApple} disabled={paying}>
            <Ionicons name="logo-apple" size={19} color="#fff" />
            <Text style={styles.appleText}>Pay</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>or pay with card</Text>
            <View style={styles.line} />
          </View>

          {saved ? (
            <Pressable style={[styles.savedRow, usingSaved && styles.savedRowOn]} onPress={() => setUseSaved(true)}>
              <Ionicons name="card-outline" size={18} color={COLORS.accent} />
              <Text style={styles.savedText}>{saved.brand} ending {saved.last4}</Text>
              {usingSaved ? <Ionicons name="checkmark-circle" size={18} color={COLORS.accent} /> : <View style={{ width: 18 }} />}
            </Pressable>
          ) : null}

          {usingSaved ? (
            <Pressable onPress={() => setUseSaved(false)}><Text style={styles.useNew}>Use a different card</Text></Pressable>
          ) : (
            <View style={styles.form}>
              <TextInput style={styles.input} placeholder="Card number" placeholderTextColor={COLORS.muted} keyboardType="number-pad" value={number} onChangeText={(v) => setNumber(formatCardNumber(v))} />
              <View style={styles.formRow}>
                <TextInput style={[styles.input, styles.half]} placeholder="MM/YY" placeholderTextColor={COLORS.muted} keyboardType="number-pad" value={expiry} onChangeText={(v) => setExpiry(formatExpiry(v))} />
                <TextInput style={[styles.input, styles.half]} placeholder="CVC" placeholderTextColor={COLORS.muted} keyboardType="number-pad" value={cvc} onChangeText={(v) => setCvc(v.replace(/\D/g, '').slice(0, 4))} />
              </View>
              <TextInput style={styles.input} placeholder="Name on card" placeholderTextColor={COLORS.muted} value={name} onChangeText={setName} />
              <Pressable style={styles.saveRow} onPress={() => setSave((v) => !v)}>
                <Ionicons name={save ? 'checkbox' : 'square-outline'} size={20} color={save ? COLORS.accent : COLORS.muted} />
                <Text style={styles.saveText}>Save this card for next time</Text>
              </Pressable>
            </View>
          )}

          <Pressable style={[styles.payBtn, (!canPay || paying) && styles.off]} disabled={!canPay || paying} onPress={payCard}>
            {paying ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.payText}>{payLabel}</Text>}
          </Pressable>
          <Text style={styles.previewNote}>Secure preview. No card is charged yet.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(43,38,34,0.45)', justifyContent: 'flex-end' },
  backdropTap: { flex: 1 },
  sheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 16 },
  headRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink },
  amount: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.accent },
  appleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#000', borderRadius: 14, paddingVertical: 14 },
  appleText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  off: { opacity: 0.5 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  line: { flex: 1, height: 1, backgroundColor: COLORS.line },
  dividerText: { fontSize: 12, color: COLORS.muted },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14, backgroundColor: COLORS.card },
  savedRowOn: { borderColor: COLORS.accent },
  savedText: { flex: 1, fontSize: 14, color: COLORS.ink },
  useNew: { fontSize: 13, color: COLORS.accent, marginTop: 12, paddingVertical: 4 },
  form: { gap: 10 },
  input: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: COLORS.ink, backgroundColor: COLORS.card },
  formRow: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, marginTop: 2 },
  saveText: { fontSize: 14, color: COLORS.ink },
  payBtn: { marginTop: 18, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.taupe, alignItems: 'center' },
  payText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  previewNote: { fontSize: 12, color: COLORS.muted, textAlign: 'center', marginTop: 12 },
});
