import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { getExpertForEmail } from '@/lib/experts';
import { useExpertBookings } from '@/lib/bookings';
import { usePayoutDetails, savePayoutDetails } from '@/lib/payouts';
import { splitFor } from '@/constants/splits';
import type { Expert } from '@/constants/experts';

export default function ExpertPayouts() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [expert, setExpert] = useState<Expert | null | undefined>(undefined);
  useEffect(() => {
    if (user?.email) getExpertForEmail(user.email).then(setExpert);
    else setExpert(null);
  }, [user?.email]);

  const { items: bookings } = useExpertBookings(expert?.id);
  const { data: saved } = usePayoutDetails(expert?.id);

  const [holder, setHolder] = useState('');
  const [bank, setBank] = useState('');
  const [iban, setIban] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [country, setCountry] = useState('');
  const [bankOpen, setBankOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (saved) {
      setHolder(saved.account_holder ?? '');
      setBank(saved.bank_name ?? '');
      setIban(saved.iban ?? '');
      setAccountNumber((saved as any).account_number ?? '');
      setCountry(saved.country ?? '');
    }
  }, [saved]);

  const weekAgo = Date.now() - 7 * 86400000;
  const total = bookings.length;
  const newWeek = bookings.filter((b) => new Date(b.created_at).getTime() > weekAgo).length;
  const programs = bookings.filter((b) => b.kind === 'program').length;
  const sessions = total - programs;

  const save = async () => {
    if (!expert) return;
    setBusy(true);
    setStatus(null);
    const { error } = await savePayoutDetails(expert.id, {
      account_holder: holder.trim(),
      bank_name: bank.trim(),
      iban: iban.trim(),
      account_number: accountNumber.trim(),
      country: country.trim(),
    } as any);
    setStatus(error ? 'Could not save, please try again.' : 'Saved.');
    setBusy(false);
    if (!error) setBankOpen(false);
  };

  if (role !== 'expert' && role !== 'admin') {
    return <Screen router={router}><View style={styles.center}><Text style={styles.muted}>This area is for experts.</Text></View></Screen>;
  }
  if (expert === undefined) {
    return <Screen router={router}><View style={styles.center}><ActivityIndicator color={COLORS.accent} /></View></Screen>;
  }
  if (!expert) {
    return <Screen router={router}><View style={styles.center}><Text style={styles.muted}>Your profile isn't linked yet.</Text></View></Screen>;
  }

  const split = splitFor(expert.id);

  return (
    <Screen router={router}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.h1}>Payouts</Text>
          <Text style={styles.sub}>How your page is doing, and where we send your earnings.</Text>

          <View style={styles.statGrid}>
            <Stat label="Total bookings" value={String(total)} />
            <Stat label="New this week" value={String(newWeek)} />
            <Stat label="Programs" value={String(programs)} />
            <Stat label="Sessions" value={String(sessions)} />
          </View>

          <View style={styles.earnCard}>
            <Ionicons name="wallet-outline" size={22} color={COLORS.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.earnTitle}>Your share</Text>
              {split.online === split.inPerson ? (
                <Text style={styles.earnBig}>You keep {split.online}% of every booking.</Text>
              ) : (
                <>
                  <Text style={styles.earnBig}>Online sessions — you keep {split.online}%</Text>
                  <Text style={styles.earnBig}>In-person sessions — you keep {split.inPerson}%</Text>
                </>
              )}
              <Text style={styles.earnNoteSmall}>Paid out within the agreed timeframe after each completed session.</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Your payouts</Text>
          {bookings.length === 0 ? (
            <Text style={styles.payEmpty}>Payouts will appear here after your first booking.</Text>
          ) : (
            bookings.slice(0, 8).map((b) => (
              <View key={b.id} style={styles.payRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payTitle} numberOfLines={1}>{b.title}</Text>
                  <Text style={styles.payMeta}>{b.when_text}</Text>
                </View>
                <Text style={styles.payShare}>You keep {split.online}%</Text>
              </View>
            ))
          )}
          <Text style={styles.payNote}>Amounts are shown once pricing is attached to each booking.</Text>

          <Pressable style={styles.dropHead} onPress={() => setBankOpen((v) => !v)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dropTitle}>Bank details</Text>
              <Text style={styles.dropSub}>{holder || iban || accountNumber ? 'Saved · tap to edit' : 'Add where we send your payouts'}</Text>
            </View>
            <Ionicons name={bankOpen ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.muted} />
          </Pressable>

          {bankOpen ? (
            <View style={styles.dropBody}>
              <Text style={styles.sectionSub}>Saved securely and shared only with The Intend for payouts.</Text>
              <Field label="Account holder name" value={holder} onChangeText={setHolder} />
              <Field label="Bank name" value={bank} onChangeText={setBank} />
              <Field label="IBAN" value={iban} onChangeText={setIban} autoCapitalize="characters" />
              <Field label="Account number" value={accountNumber} onChangeText={setAccountNumber} autoCapitalize="characters" />
              <Field label="Country" value={country} onChangeText={setCountry} />
              <Pressable style={styles.saveBtn} onPress={save} disabled={busy}>
                {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.saveText}>Save bank details</Text>}
              </Pressable>
              {status ? <Text style={styles.status}>{status}</Text> : null}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Field({ label, value, onChangeText, autoCapitalize }: { label: string; value: string; onChangeText: (t: string) => void; autoCapitalize?: any }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={autoCapitalize ?? 'words'}
        style={styles.input}
        placeholderTextColor={COLORS.muted}
      />
    </View>
  );
}

function Screen({ children, router }: { children: any; router: any }) {
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
  sub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginBottom: 20 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  stat: { width: '47%', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16 },
  statValue: { fontFamily: FONT_SERIF, fontSize: 28, color: COLORS.ink },
  statLabel: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  earnCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: COLORS.accentSoft, borderRadius: 16, padding: 16, marginBottom: 8 },
  earnText: { flex: 1, fontSize: 14, lineHeight: 21, color: COLORS.ink },
  earnTitle: { fontSize: 12, letterSpacing: 1, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 4 },
  earnBig: { fontFamily: FONT_SERIF, fontSize: 17, color: COLORS.ink, marginTop: 2 },
  earnNoteSmall: { fontSize: 12, lineHeight: 18, color: COLORS.muted, marginTop: 8 },
  sectionTitle: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginTop: 28, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: COLORS.muted, marginBottom: 14 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  input: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: COLORS.ink },
  saveBtn: { marginTop: 12, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.accent, alignItems: 'center' },
  saveText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  status: { fontSize: 14, lineHeight: 20, color: COLORS.ink, marginTop: 14, textAlign: 'center' },
  dropHead: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginTop: 8 },
  dropTitle: { fontFamily: FONT_SERIF, fontSize: 18, color: COLORS.ink },
  dropSub: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  dropBody: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderTopWidth: 0, borderColor: COLORS.line, paddingHorizontal: 16, paddingBottom: 16, marginTop: -8, paddingTop: 8 },
  payRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 14, marginBottom: 8 },
  payTitle: { fontFamily: FONT_SERIF, fontSize: 15, color: COLORS.ink },
  payMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  payShare: { fontSize: 13, color: COLORS.accent, marginLeft: 10 },
  payEmpty: { fontSize: 14, color: COLORS.muted },
  payNote: { fontSize: 12, lineHeight: 18, color: COLORS.muted, marginTop: 6, marginBottom: 4 },
});

