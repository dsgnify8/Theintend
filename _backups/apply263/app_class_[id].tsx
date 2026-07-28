import { useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSessions } from '@/lib/sessions';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { createBooking } from '@/lib/bookings';

export default function ClassDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { classes: CLASSES } = useSessions();
  const { classes } = useSessions();
  const item = classes.find((c) => c.id === id);
  const [rsvped, setRsvped] = useState(false);

  if (!item) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackBar onPress={() => router.back()} />
        <Text style={styles.missing}>Class not found.</Text>
      </SafeAreaView>
    );
  }

  const onRsvp = () => {
    setRsvped(true);
    createBooking({
      refId: item.id,
      expertId: item.expertId,
      kind: 'class',
      title: item.title,
      when: `${item.date} · ${item.time}`,
      expert: item.expertName,
      link: item.link,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackBar onPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ImageBackground source={item.banner} style={[styles.cover, { backgroundColor: item.color }]} imageStyle={styles.coverImg} resizeMode="cover">
          <View style={styles.coverScrim} pointerEvents="none" />
          <Text style={styles.coverTitle}>{item.title}</Text>
        </ImageBackground>

        <View style={styles.metaRow}>
          <Text style={styles.pill}>{item.date}</Text>
          <Text style={styles.pill}>{item.time}</Text>
        </View>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.going}>{item.going} going</Text>

        <View style={styles.bookRow}>
          <View style={styles.virtual}>
            <Ionicons name="videocam-outline" size={18} color={COLORS.ink} />
            <Text style={styles.virtualText}>Virtual call · book for link</Text>
          </View>
          {!rsvped ? (
            <Pressable style={styles.rsvp} onPress={onRsvp}>
              <Text style={styles.rsvpText}>RSVP</Text>
            </Pressable>
          ) : (
            <View style={styles.rsvpDone}>
              <Ionicons name="checkmark" size={16} color={COLORS.bg} />
              <Text style={styles.rsvpDoneText}>Going</Text>
            </View>
          )}
        </View>

        {rsvped ? (
          <View>
            <Text style={styles.confirm}>
              You are on the list.{item.link ? ' Your join link is below, and saved to this booking under You.' : ' The join link will appear here before it starts.'}
            </Text>
            {item.link ? (
              <Pressable style={styles.joinBtn} onPress={() => Linking.openURL(item.link!)}>
                <Ionicons name="videocam" size={16} color={COLORS.bg} />
                <Text style={styles.joinText}>Open join link</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>About this session</Text>
        <Text style={styles.body}>{item.description}</Text>

        <Text style={styles.sectionTitle}>About the expert</Text>
        <Pressable style={styles.expertRow} onPress={() => router.push(`/expert/${item.expertId}`)}>
          <View>
            <Text style={styles.expertName}>{item.expertName}</Text>
            <Text style={styles.expertTitle}>{item.expertTitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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
  cover: { height: 180, borderRadius: 20, padding: 20, justifyContent: 'flex-end', marginBottom: 18, overflow: 'hidden' },
  coverTitle: { fontFamily: FONT_SERIF, fontSize: 30, lineHeight: 34, color: '#FFFFFF' },
  coverImg: { borderRadius: 20 },
  coverScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20, backgroundColor: 'rgba(43,38,34,0.32)' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pill: { fontSize: 12, color: COLORS.ink, backgroundColor: COLORS.accentSoft, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, overflow: 'hidden' },
  title: { fontFamily: FONT_SERIF, fontSize: 26, lineHeight: 32, color: COLORS.ink },
  going: { fontSize: 14, color: COLORS.muted, marginTop: 8 },
  bookRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginTop: 18 },
  virtual: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  virtualText: { fontSize: 13, color: COLORS.ink },
  rsvp: { backgroundColor: COLORS.ink, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 999 },
  rsvpText: { color: COLORS.bg, fontSize: 14 },
  rsvpDone: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.accent, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999 },
  rsvpDoneText: { color: COLORS.bg, fontSize: 14 },
  confirm: { fontSize: 13, lineHeight: 20, color: COLORS.muted, marginTop: 12 },
  sectionTitle: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginTop: 28, marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 24, color: COLORS.ink, opacity: 0.88 },
  expertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16 },
  expertName: { fontFamily: FONT_SERIF, fontSize: 17, color: COLORS.ink },
  expertTitle: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: 12, backgroundColor: COLORS.accent, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999 },
  joinText: { color: COLORS.bg, fontSize: 14 },
  missing: { padding: 24, fontSize: 15, color: COLORS.muted },
});
