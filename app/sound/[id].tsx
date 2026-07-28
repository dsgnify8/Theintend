import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SOUNDS } from '@/constants/sounds';
import { recordListen, useLiked, toggleLiked } from '@/lib/store';
import { playTrack, togglePlay, seekTo, usePlayerStatus } from '@/lib/player';
import { localUriFor, downloadTrack, removeDownload } from '@/lib/offline';
import { COLORS, FONT_SERIF } from '@/constants/brand';

const COVERS: Record<string, any> = {
  'quantum-focus': require('../../assets/images/quantum-focus-cover.jpg'),
  '432hz-energizer': require('../../assets/images/432hz-cover.jpg'),
};

function fmt(sec: number) {
  if (!sec || sec < 0 || !isFinite(sec)) return '0:00';
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export default function SoundPlayer() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sound = SOUNDS.find((s) => s.id === id);

  const status = usePlayerStatus();
  const likedIds = useLiked();
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [seeking, setSeeking] = useState<number | null>(null);

  useEffect(() => { if (id) recordListen(id); }, [id]);

  useEffect(() => {
    let alive = true;
    if (!id) return;
    localUriFor(id).then((uri) => {
      if (!alive) return;
      setLocalUri(uri);
      setDownloaded(!!uri);
    });
    return () => { alive = false; };
  }, [id]);

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

  const hasAudio = !!sound.url;
  const isCurrent = status.id === sound.id;
  const playing = isCurrent && status.playing;
  const duration = isCurrent ? status.duration : 0;
  const position = isCurrent ? (seeking != null ? seeking : status.currentTime) : 0;
  const liked = likedIds.includes(sound.id);

  const toggle = () => {
    if (!hasAudio) return;
    if (isCurrent) togglePlay();
    else playTrack(sound.id, localUri ?? sound.url!, sound.title);
  };

  const onToggleDownload = async (val: boolean) => {
    if (!hasAudio || downloading) return;
    if (val) {
      setDownloading(true);
      setProgress(0);
      const ok = await downloadTrack(sound.id, sound.url!, (f) => setProgress(f));
      setDownloading(false);
      if (ok) {
        const uri = await localUriFor(sound.id);
        setLocalUri(uri);
        setDownloaded(true);
      } else {
        setDownloaded(false);
      }
    } else {
      await removeDownload(sound.id);
      setLocalUri(null);
      setDownloaded(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBar}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
          <Text style={styles.backText}>Sounds</Text>
        </Pressable>
        <Pressable onPress={() => toggleLiked(sound.id)} hitSlop={10}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? COLORS.accent : COLORS.ink} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {COVERS[sound.id] ? (
          <Image source={COVERS[sound.id]} style={styles.art} resizeMode="cover" />
        ) : (
          <View style={[styles.art, { backgroundColor: sound.color }]}>
            <Ionicons name="musical-notes" size={40} color="rgba(255,255,255,0.9)" />
          </View>
        )}

        <Text style={styles.title}>{sound.title}</Text>
        <Text style={styles.meta}>{sound.category} · {sound.duration}</Text>
        <Text style={styles.purpose}>{sound.purpose}</Text>

        {hasAudio ? (
          <>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration > 0 ? duration : 1}
              value={position}
              onValueChange={(v) => setSeeking(v)}
              onSlidingComplete={(v) => { seekTo(v); setSeeking(null); }}
              minimumTrackTintColor={COLORS.accent}
              maximumTrackTintColor={COLORS.line}
              thumbTintColor={COLORS.accent}
            />
            <View style={styles.times}>
              <Text style={styles.time}>{fmt(position)}</Text>
              <Text style={styles.time}>{duration > 0 ? fmt(duration) : sound.duration}</Text>
            </View>

            <Pressable style={styles.playBtn} onPress={toggle}>
              <Ionicons name={playing ? 'pause' : 'play'} size={30} color={COLORS.bg} style={playing ? undefined : { marginLeft: 3 }} />
            </Pressable>
            {isCurrent && !status.isLoaded ? <Text style={styles.status}>Loading…</Text> : null}
            <Text style={styles.status}>Keeps playing while you explore the app.</Text>
          </>
        ) : (
          <>
            <View style={styles.track}><View style={styles.trackFill} /></View>
            <View style={styles.times}>
              <Text style={styles.time}>0:00</Text>
              <Text style={styles.time}>{sound.duration}</Text>
            </View>
            <View style={[styles.playBtn, styles.playOff]}>
              <Ionicons name="play" size={30} color={COLORS.bg} style={{ marginLeft: 3 }} />
            </View>
            <Text style={styles.status}>This track is coming soon.</Text>
          </>
        )}

        <View style={styles.downloadRow}>
          <View>
            <Text style={styles.downloadLabel}>Download for offline</Text>
            <Text style={styles.downloadHint}>{downloading ? `Downloading… ${Math.round(progress * 100)}%` : downloaded ? 'Available offline, no wifi needed' : 'Listen anywhere, no wifi needed'}</Text>
          </View>
          <Switch value={downloaded || downloading} disabled={downloading} onValueChange={onToggleDownload} trackColor={{ true: COLORS.accent, false: COLORS.line }} />
        </View>
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
  slider: { width: '100%', marginTop: 22, height: 40 },
  track: { width: '100%', height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginTop: 28, overflow: 'hidden' },
  trackFill: { width: '0%', height: 4, backgroundColor: COLORS.accent },
  times: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 0 },
  time: { fontSize: 12, color: COLORS.muted },
  playBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.taupe, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  playOff: { opacity: 0.4 },
  status: { fontSize: 12, color: COLORS.muted, marginTop: 14, textAlign: 'center' },
  downloadRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginTop: 28 },
  downloadLabel: { fontSize: 15, color: COLORS.ink },
  downloadHint: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  missing: { padding: 24, fontSize: 15, color: COLORS.muted },
});
