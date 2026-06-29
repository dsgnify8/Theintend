import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONT_SERIF, USER } from '@/constants/brand';

export default function YouScreen() {
  const router = useRouter();
  const initials = USER.name.split(' ').map((p) => p[0]).slice(0, 2).join('');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{USER.name}</Text>
          <Text style={styles.email}>{USER.email}</Text>
        </View>

        <Section title="Saved reads">
          <Empty text="Nothing saved yet. Tap the bookmark on any article to keep it here." />
        </Section>

        <Section title="Upcoming sessions">
          <Empty text="No upcoming sessions yet." />
          <Pressable style={styles.cta} onPress={() => router.navigate('/experts')}>
            <Text style={styles.ctaText}>Book with an expert</Text>
          </Pressable>
        </Section>

        <Section title="Past sessions">
          <Empty text="Your completed sessions will appear here." />
        </Section>

        <Section title="Seminars">
          <Empty text="Upcoming seminars and events are coming soon." />
        </Section>

        <Section title="Account">
          <Row label="Personal information" />
          <Row label="Notifications" />
          <Row label="Language" value="English" />
          <Row label="Help & support" />
          <Row label="Sign out" />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <Pressable style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : <Text style={styles.rowChevron}>{'\u203A'}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },
  profile: { alignItems: 'center', paddingVertical: 20 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarText: { fontFamily: FONT_SERIF, fontSize: 30, color: COLORS.accent },
  name: { fontFamily: FONT_SERIF, fontSize: 24, color: COLORS.ink },
  email: { fontSize: 14, color: COLORS.muted, marginTop: 4 },
  sectionWrap: { marginTop: 26 },
  sectionTitle: { fontFamily: FONT_SERIF, fontSize: 18, color: COLORS.ink, marginBottom: 12 },
  empty: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 18 },
  emptyText: { fontSize: 14, lineHeight: 21, color: COLORS.muted },
  cta: { marginTop: 10, alignSelf: 'flex-start', paddingVertical: 12, paddingHorizontal: 22, borderRadius: 999, backgroundColor: COLORS.accent },
  ctaText: { color: COLORS.bg, fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 16, paddingHorizontal: 16, marginBottom: 8 },
  rowLabel: { fontSize: 15, color: COLORS.ink },
  rowValue: { fontSize: 14, color: COLORS.muted },
  rowChevron: { fontSize: 18, color: COLORS.muted },
});
