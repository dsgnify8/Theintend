import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { useExperts } from '@/lib/experts';
import { useAllPayoutDetails } from '@/lib/payouts';
import { splitFor, exceptionsFor } from '@/constants/splits';
import { minorToAed, providerLabel, useOrderStats } from '@/lib/orderStats';

export default function AdminPayouts() {
  const router = useRouter();
  const { role } = useAuth();
  const { experts, loading } = useExperts();
  const { rows, loading: rowsLoading } = useAllPayoutDetails();
  const orders = useOrderStats();

  if (role !== 'admin') {
    return <Screen router={router}><View style={styles.center}><Text style={styles.muted}>Admins only.</Text></View></Screen>;
  }

  return (
    <Screen router={router}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>Expert payouts</Text>
        <Text style={styles.sub}>Revenue splits and bank details for every expert.</Text>

        {!orders.loading && orders.totalPaid > 0 ? (
          <View style={styles.checkoutCard}>
            <Text style={styles.checkoutHead}>CHECKOUTS</Text>
            {orders.paid.map((pr) => (
              <View key={pr.provider} style={styles.checkoutRow}>
                <Text style={styles.checkoutName}>{providerLabel(pr.provider)}</Text>
                <Text style={styles.checkoutCount}>{pr.count}</Text>
                <Text style={styles.checkoutValue}>{minorToAed(pr.totalMinor)}</Text>
              </View>
            ))}
            {orders.tabbyShare != null ? (
              <Text style={styles.checkoutNote}>
                Tabby is {orders.tabbyShare}% of paid checkouts.
                {orders.failed > 0 ? ` ${orders.failed} did not complete.` : ''}
              </Text>
            ) : null}
          </View>
        ) : null}

        {loading || rowsLoading ? (
          <View style={styles.loaderBox}><ActivityIndicator color={COLORS.accent} /></View>
        ) : (
          experts.map((e) => {
            const split = splitFor(e.id);
            const exceptions = exceptionsFor(e.id);
            const bank = rows[e.id];
            const sameRate = split.online === split.inPerson;
            return (
              <View key={e.id} style={styles.card}>
                <Text style={styles.name}>{e.name}</Text>
                <Text style={styles.title}>{e.title}</Text>

                <View style={styles.splitBox}>
                  {sameRate ? (
                    <Text style={styles.splitLine}>All bookings, expert keeps {split.online}% · The Intend {100 - split.online}%</Text>
                  ) : (
                    <>
                      <Text style={styles.splitLine}>Online, expert keeps {split.online}% · The Intend {100 - split.online}%</Text>
                      <Text style={styles.splitLine}>In person, expert keeps {split.inPerson}% · The Intend {100 - split.inPerson}%</Text>
                    </>
                  )}
                  {exceptions.map((ex, xi) => (
                    <Text key={xi} style={styles.splitException}>{ex.label}, expert keeps {ex.expertShare}% · The Intend {100 - ex.expertShare}%</Text>
                  ))}
                </View>

                <Text style={styles.bankHead}>BANK DETAILS</Text>
                {bank && (bank.account_holder || bank.iban) ? (
                  <View style={styles.bankBox}>
                    {bank.account_holder ? <Text style={styles.bankLine}>{bank.account_holder}</Text> : null}
                    {bank.bank_name ? <Text style={styles.bankMuted}>{bank.bank_name}</Text> : null}
                    {bank.iban ? <Text style={styles.bankMuted}>IBAN: {bank.iban}</Text> : null}
                    {(bank as any).account_number ? <Text style={styles.bankMuted}>Acct: {(bank as any).account_number}</Text> : null}
                    {bank.country ? <Text style={styles.bankMuted}>{bank.country}</Text> : null}
                  </View>
                ) : (
                  <Text style={styles.bankNone}>Not added yet.</Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

function Screen({ children, router }: { children: any; router: any }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.backBar}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} onPress={() => router.back()} />
        <Text style={styles.backText} onPress={() => router.back()}>Admin</Text>
      </View>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  backText: { fontSize: 16, color: COLORS.ink },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 15, color: COLORS.muted },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  h1: { fontFamily: FONT_SERIF, fontSize: 30, color: COLORS.ink, marginBottom: 6 },
  sub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginBottom: 20 },
  loaderBox: { paddingVertical: 40, alignItems: 'center' },
  checkoutCard: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 18 },
  checkoutHead: { fontSize: 11, letterSpacing: 1.5, color: COLORS.muted, marginBottom: 10 },
  checkoutRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  checkoutName: { flex: 1, fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  checkoutCount: { width: 44, textAlign: 'right', fontSize: 14, color: COLORS.muted },
  checkoutValue: { width: 110, textAlign: 'right', fontSize: 14, color: COLORS.ink },
  checkoutNote: { fontSize: 12, lineHeight: 18, color: COLORS.muted, marginTop: 10 },
  card: { backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 18, marginBottom: 14 },
  name: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink },
  title: { fontSize: 12, letterSpacing: 1, color: COLORS.muted, marginTop: 3, textTransform: 'uppercase' },
  splitBox: { backgroundColor: COLORS.accentSoft, borderRadius: 12, padding: 12, marginTop: 14 },
  splitLine: { fontSize: 14, color: COLORS.ink, marginVertical: 2 },
  splitException: { fontSize: 13, color: COLORS.accent, marginTop: 4 },
  bankHead: { fontSize: 11, letterSpacing: 1, color: COLORS.muted, marginTop: 16, marginBottom: 6 },
  bankBox: { gap: 2 },
  bankLine: { fontSize: 15, color: COLORS.ink },
  bankMuted: { fontSize: 13, color: COLORS.muted },
  bankNone: { fontSize: 13, color: COLORS.muted, fontStyle: 'italic' },
});

