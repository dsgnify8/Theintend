import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';

export default function BookingInfo() {
  const router = useRouter();
  const { title, when, expert, link } = useLocalSearchParams<{ title?: string; when?: string; expert?: string; link?: string }>();
  const linkStr = typeof link === 'string' ? link : '';
  const isUrl = /^https?:\/\//i.test(linkStr);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>YOUR BOOKING</Text>
        <Text style={styles.h1}>{title || 'Session'}</Text>

        <View style={styles.card}>
          {when ? (
            <View style={styles.row}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.accent} />
              <Text style={styles.rowText}>{when}</Text>
            </View>
          ) : null}
          {expert ? (
            <View style={styles.row}>
              <Ionicons name="person-outline" size={18} color={COLORS.accent} />
              <Text style={styles.rowText}>with {expert}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.label}>{isUrl ? 'Join link' : linkStr ? 'Location' : 'Link or location'}</Text>
        {linkStr ? (
          isUrl ? (
            <Pressable style={styles.linkBtn} onPress={() => Linking.openURL(linkStr)}>
              <Ionicons name="videocam-outline" size={18} color={COLORS.bg} />
              <Text style={styles.linkBtnText}>Open join link</Text>
            </Pressable>
          ) : (
            <View style={styles.locationBox}>
              <Ionicons name="location-outline" size={18} color={COLORS.accent} />
              <Text style={styles.locationText}>{linkStr}</Text>
            </View>
          )
        ) : (
          <Text style={styles.hint}>Your expert will add the join link or location before the session. You will see it here.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginTop: 6, marginBottom: 10 },
  h1: { fontFamily: FONT_SERIF, fontSize: 28, lineHeight: 34, color: COLORS.ink },
  card: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginTop: 20, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { fontSize: 15, color: COLORS.ink },
  label: { fontFamily: FONT_SERIF, fontSize: 18, color: COLORS.ink, marginTop: 28, marginBottom: 12 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.taupeBlue, borderRadius: 999, paddingVertical: 15 },
  linkBtnText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  locationBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 16 },
  locationText: { flex: 1, fontSize: 15, color: COLORS.ink },
  hint: { fontSize: 14, lineHeight: 21, color: COLORS.muted },
});
