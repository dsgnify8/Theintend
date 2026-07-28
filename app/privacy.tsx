import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';

function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.p}>{children}</Text>;
}
function H({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h}>{children}</Text>;
}

export default function Privacy() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>THE INTEND</Text>
        <Text style={styles.h1}>Privacy Policy</Text>
        <Text style={styles.date}>Last updated 3 July 2026</Text>

        <P>This policy explains what The Intend collects, why, and the choices you have. We keep it plain and we keep it short. If anything is unclear, email us at contact@theintend.com.</P>

        <H>Who we are</H>
        <P>The Intend is a wellness platform that connects you with trusted experts across areas like mental health, holistic healing, movement, nutrition, beauty, and self development. This policy covers the app and the services offered through it.</P>

        <H>What we collect</H>
        <P>Account details you give us: your name, email, and (if you add it) your phone number and a profile photo.</P>
        <P>Things you do in the app: bookings you make with experts, items you save, mood check ins, and anything you write in journals or workbooks.</P>
        <P>Basic technical information needed to run the app reliably, such as sign in tokens and error logs.</P>

        <H>How we use it</H>
        <P>To run your account, connect you with the right expert, schedule and manage your sessions, take payment for what you book, and keep the app working and secure. We do not sell your personal information.</P>

        <H>Payments</H>
        <P>Payments are handled by our payment providers, Stripe and Tabby. When you pay, your card or account details go directly to them, not to us. We never see or store your full card number. Stripe and Tabby process that information under their own privacy policies.</P>

        <H>Services we rely on</H>
        <P>We use Supabase to host our database, sign in, and file storage. We use Stripe and Tabby to process payments. When an expert connects their calendar to offer availability, we use Google Calendar only to show open times and write confirmed bookings. These providers process data on our behalf to deliver the service.</P>

        <H>Storage and security</H>
        <P>Your information is stored on secure servers and protected in transit and at rest. No system is perfectly secure, but we take reasonable steps to protect your data and limit who can access it.</P>

        <H>Your choices and rights</H>
        <P>You can view and update your name, phone, and photo any time in Personal information. You can delete your account from the You tab, which permanently removes your account and the data tied to it. You can contact us at contact@theintend.com for any request about your data.</P>

        <H>Children</H>
        <P>The Intend is not intended for children under 16, and we do not knowingly collect information from them.</P>

        <H>Changes</H>
        <P>If we update this policy, we will change the date above and, where appropriate, let you know in the app.</P>

        <H>Contact</H>
        <P>Questions about privacy or your data? Reach us any time.</P>
        <Pressable style={styles.mailBtn} onPress={() => Linking.openURL('mailto:contact@theintend.com')}>
          <Ionicons name="mail-outline" size={18} color={COLORS.bg} />
          <Text style={styles.mailText}>contact@theintend.com</Text>
        </Pressable>
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 22, paddingBottom: 40 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginTop: 6, marginBottom: 10 },
  h1: { fontFamily: FONT_SERIF, fontSize: 32, lineHeight: 38, color: COLORS.ink },
  date: { fontSize: 13, color: COLORS.muted, marginTop: 6, marginBottom: 20 },
  h: { fontFamily: FONT_SERIF, fontSize: 19, color: COLORS.ink, marginTop: 22, marginBottom: 8 },
  p: { fontSize: 15, lineHeight: 24, color: COLORS.ink, opacity: 0.9, marginBottom: 10 },
  mailBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.taupe, borderRadius: 999, paddingVertical: 15, marginTop: 14 },
  mailText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.3 },
});
