import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SOUNDS } from '@/constants/sounds';
import { COLORS, FONT_SERIF } from '@/constants/brand';

export default function SoundPlayer() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sound = SOUNDS.find((s) => s.id === id);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  if (!sound) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
          <Text style={styles.backText}>Sounds</Text>
        </Pressable>
        <Text style={styles.missing}>Sound not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBar}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
          <Text style={styles.backText}>Sounds</Text>
        </Pressable>
        <Pressable onPress={() => setLiked((v) => !v)} hitSlop={10}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? COLORS.accent : COLORS.ink} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={[styles.art, { backgroundColor: sound.color }]}>
          <Ionicons name="musical-notes" size={40} color="rgba(255,255,255,0.9)" />
        </View>

        <Text style={styles.title}>{sound.title}</Text>
        <Text style={styles.meta}>{sound.category} · {sound.duration}</Text>
        <Text style={styles.purpose}>{sound.purpose}</Text>

        <View style={styles.track}>
          <View style={styles.trackFill} />
        </View>
        <View style={styles.times}>
          <Text style={styles.time}>0:00</Text>
          <Text style={styles.time}>{sound.duration.split('–')[0].trim()}</Text>
        </View>

        <Pressable style={styles.playBtn} onPress={() => setPlaying((v) => !v)}>
          <Ionicons name={playing ? 'pause' : 'play'} size={30} color={COLORS.bg} />
        </Pressable>

        <View style={styles.downloadRow}>
          <View>
            <Text style={styles.downloadLabel}>Download for offline</Text>
            <Text style={styles.downloadHint}>{downloaded ? 'Available without wifi' : 'Listen anywhere, no wifi needed'}</Text>
          </View>
          <Switch
            value={downloaded}
            onValueChange={setDownloaded}
            trackColor={{ true: COLORS.accent, false: COLORS.line }}
          />
        </View>

        <Text style={styles.status}>Playback and offline download are being connected next.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  backBar: { flexDirection: 'row', alignItems: 'center' },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 24, alignItems: 'center', paddingTop: 8 },
  art: { width: 220, height: 220, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  title: { fontFamily: FONT_SERIF, fontSize: 28, color: COLORS.ink, textAlign: 'center' },
  meta: { fontSize: 12, letterSpacing: 1, color: COLORS.muted, marginTop: 8, textTransform: 'uppercase' },
  purpose: { fontSize: 15, color: COLORS.ink, opacity: 0.8, marginTop: 10, textAlign: 'center' },
  track: { width: '100%', height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginTop: 28, overflow: 'hidden' },
  trackFill: { width: '0%', height: 4, backgroundColor: COLORS.accent },
  times: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  time: { fontSize: 12, color: COLORS.muted },
  playBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  downloadRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginTop: 28 },
  downloadLabel: { fontSize: 15, color: COLORS.ink },
  downloadHint: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  status: { fontSize: 12, color: COLORS.muted, marginTop: 18, textAlign: 'center' },
  missing: { padding: 24, fontSize: 15, color: COLORS.muted },
});
