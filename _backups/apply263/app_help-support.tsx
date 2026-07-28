import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';

export default function HelpSupport() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>You</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>THE INTEND</Text>
        <Text style={styles.h1}>Why we're here</Text>

        <Text style={styles.p}>
          The Intend brings together trusted experts in mental health, holistic healing, movement, nutrition, beauty, and self-development. People who have dedicated their lives to their fields and are here to guide you through yours. Not with quick fixes or trending methods. With real knowledge, real conversation, and real support.
        </Text>
        <Text style={styles.p}>
          You can read, learn, and explore through our articles and resources. And when you're ready to go deeper, you can connect directly with the experts themselves. One session or ongoing, at your own pace, on your own terms.
        </Text>
        <Text style={styles.p}>
          We believe healing isn't just about what you do. It's about how you feel. True transformation begins when you learn to meet yourself where you are emotionally. Whether it's breathwork, nutrition, movement, or working through something that's been sitting quietly inside you for years, none of it creates lasting change unless it touches the root: your inner life.
        </Text>
        <Text style={styles.p}>
          At the core of everything we do is a genuine desire for people to love their lives. Not to manage them. Not to cope with them. To actually enjoy being alive.
        </Text>
        <Text style={styles.p}>
          Most people who find us are not looking for a diagnosis. They have already named what is wrong a hundred times. What they want is direction. Someone who understands the specific part of life they are trying to move through, and can guide them there with honesty and care.
        </Text>
        <Text style={styles.p}>
          We didn't build this platform around therapy or sitting in the same problem week after week. We built it around growth. Around finding the right person for where you are right now, and letting that guidance open something in you that was always there. That's the difference, and that's the intention behind everything at The Intend.
        </Text>

        <Pressable style={styles.policyRow} onPress={() => router.push('/privacy')}>
          <Text style={styles.policyText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </Pressable>

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Need a hand?</Text>
          <Text style={styles.contactBody}>If you need any assistance or have questions, we're here.</Text>
          <Pressable style={styles.contactBtn} onPress={() => Linking.openURL('mailto:contact@theintend.com')}>
            <Ionicons name="mail-outline" size={18} color={COLORS.bg} />
            <Text style={styles.contactBtnText}>contact@theintend.com</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 22, paddingBottom: 56 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginTop: 6, marginBottom: 12 },
  h1: { fontFamily: FONT_SERIF, fontSize: 34, lineHeight: 40, color: COLORS.ink, marginBottom: 20 },
  p: { fontSize: 16, lineHeight: 26, color: COLORS.ink, opacity: 0.9, marginBottom: 18 },
  policyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 16, paddingHorizontal: 16, marginTop: 20 },
  policyText: { fontSize: 15, color: COLORS.ink },
  contactCard: { backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, padding: 22, marginTop: 14 },
  contactTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginBottom: 8 },
  contactBody: { fontSize: 15, lineHeight: 22, color: COLORS.muted, marginBottom: 18 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.accent, borderRadius: 999, paddingVertical: 15 },
  contactBtnText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.3 },
});
