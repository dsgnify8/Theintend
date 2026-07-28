import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { BREATH_PROGRAMS } from '@/constants/breathwork';
import { COLORS, FONT_SERIF } from '@/constants/brand';

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? '0' : ''}${r}`;
}

export default function BreathPlayer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const program = BREATH_PROGRAMS.find((p) => p.id === id);

  const [pi, setPi] = useState(0);
  const [running, setRunning] = useState(true);
  const [muted, setMuted] = useState(false);
  const [remaining, setRemaining] = useState(program?.pattern[0]?.secs ?? 0);
  const [elapsed, setElapsed] = useState(0);
  const scale = useRef(new Animated.Value(0.55)).current;

  // Breathing cues via expo-audio: a soft tone as each phase begins.
  const players = useRef<{ inhale?: AudioPlayer; hold?: AudioPlayer; exhale?: AudioPlayer }>({});
  const mutedRef = useRef(muted);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { await setAudioModeAsync({ playsInSilentMode: true }); } catch {}
      if (!alive) return;
      try {
        players.current = {
          inhale: createAudioPlayer(require('../../assets/sounds/breathe-in.wav')),
          hold: createAudioPlayer(require('../../assets/sounds/hold.wav')),
          exhale: createAudioPlayer(require('../../assets/sounds/breathe-out.wav')),
        };
      } catch {}
    })();
    return () => {
      alive = false;
      const p = players.current;
      try { p.inhale?.remove(); p.hold?.remove(); p.exhale?.remove(); } catch {}
    };
  }, []);

  const playCue = (label: string) => {
    if (mutedRef.current) return;
    const p = players.current;
    const pl = label === 'Breathe in' ? p.inhale : label === 'Breathe out' ? p.exhale : p.hold;
    if (!pl) return;
    try { pl.seekTo(0); pl.play(); } catch {}
  };

  // Total session timer
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  // Phase machine: animate the circle for the current phase, then advance
  useEffect(() => {
    if (!program || !running) return;
    const phase = program.pattern[pi];
    setRemaining(phase.secs);
    playCue(phase.label);
    Animated.timing(scale, {
      toValue: phase.target,
      duration: phase.secs * 1000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
    const tick = setInterval(() => setRemaining((r) => (r > 1 ? r - 1 : r)), 1000);
    const next = setTimeout(() => {
      clearInterval(tick);
      setPi((i) => (i + 1) % program.pattern.length);
    }, phase.secs * 1000);
    return () => {
      clearTimeout(next);
      clearInterval(tick);
    };
  }, [pi, running, program]);

  if (!program) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}><Text style={styles.muted}>Session not found.</Text></View>
      </SafeAreaView>
    );
  }

  const phase = program.pattern[pi];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.close} onPress={() => router.back()} hitSlop={12}>
        <Ionicons name="close" size={26} color={COLORS.ink} />
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.kicker}>BREATHWORK</Text>
        <Text style={styles.title}>{program.title}</Text>
        <Text style={styles.timer}>{fmt(elapsed)} / {program.minutes}:00</Text>
      </View>

      <View style={styles.stage}>
        <View style={styles.ringOuter} />
        <Animated.View style={[styles.orb, { backgroundColor: program.color, transform: [{ scale }] }]} />
        <View style={styles.cue}>
          <Text style={styles.cueLabel}>{phase.label}</Text>
          <Text style={styles.cueCount}>{remaining}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable style={styles.ctrlBtn} onPress={() => setRunning((r) => !r)}>
          <Ionicons name={running ? 'pause' : 'play'} size={22} color={COLORS.bg} />
          <Text style={styles.ctrlText}>{running ? 'Pause' : 'Resume'}</Text>
        </Pressable>
        <Pressable style={styles.muteBtn} onPress={() => setMuted((m) => !m)} hitSlop={8}>
          <Ionicons name={muted ? 'volume-mute-outline' : 'volume-medium-outline'} size={22} color={COLORS.ink} />
        </Pressable>
      </View>
      <Text style={styles.note}>{program.description}</Text>
    </SafeAreaView>
  );
}

const ORB = 220;
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  close: { position: 'absolute', top: 52, right: 20, zIndex: 5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 15, color: COLORS.muted },
  header: { alignItems: 'center', paddingTop: 36 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted },
  title: { fontFamily: FONT_SERIF, fontSize: 26, color: COLORS.ink, marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },
  timer: { fontSize: 14, color: COLORS.muted, marginTop: 8 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringOuter: { position: 'absolute', width: ORB + 60, height: ORB + 60, borderRadius: (ORB + 60) / 2, borderWidth: 1, borderColor: COLORS.line },
  orb: { width: ORB, height: ORB, borderRadius: ORB / 2, opacity: 0.92 },
  cue: { position: 'absolute', alignItems: 'center' },
  cueLabel: { fontFamily: FONT_SERIF, fontSize: 24, color: '#FFFFFF' },
  cueCount: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 14 },
  ctrlBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.accent, paddingVertical: 14, paddingHorizontal: 30, borderRadius: 999 },
  ctrlText: { color: COLORS.bg, fontSize: 15 },
  muteBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card },
  note: { fontSize: 13, lineHeight: 20, color: COLORS.muted, textAlign: 'center', paddingHorizontal: 32, marginBottom: 16 },
});
