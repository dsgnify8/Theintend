// The first time someone opens the companion on a new account.
//
// Sits over the chat rather than being its own route, so dismissing it fades
// straight into a conversation that is already there.
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { DURATION, EASE, reduceMotion } from '@/constants/motion';

const SKY = require('@/assets/images/companion-sky.jpg');
// Slight, because the type is dark. A heavier one would only mute the colour.
const SCRIM = ['rgba(28,24,20,0.20)', 'rgba(28,24,20,0.10)', 'rgba(28,24,20,0.22)'];

// Keyed by account. Not added to the sign out sweep on purpose, so signing
// back in does not show it again.
// Left here rather than removed, so the screen can be looked at again by
// turning it on. On means every person sees it every time, so it goes back
// to false straight after.
const ALWAYS_SHOW_FOR_TESTING = false;

const SEEN_KEY = 'intend.companion.intro.';

const BODY = `I am here for your journey with yourself.

I am not here for general questions or everyday tasks, and I am not a doctor or a therapist. When something needs one, I will say so.

Bring me your life and I will stay with it for as long as you want to.`;

// Two characters a frame, so a short piece of text takes a few seconds. Fast
// enough not to test anyone's patience, slow enough to read as writing.
const STEP = 2;
const TICK = 22;

export function CompanionIntro({ userId }: { userId?: string }) {
  const [phase, setPhase] = useState<'checking' | 'show' | 'gone'>('checking');
  const [shown, setShown] = useState(0);
  const [still, setStill] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const caret = useRef(new Animated.Value(1)).current;

  // No account, nothing to remember it against, so nothing is shown.
  useEffect(() => {
    let alive = true;
    if (!userId) { setPhase('gone'); return; }
    (async () => {
      const off = await reduceMotion();
      let seen = false;
      try {
        seen = !!(await AsyncStorage.getItem(SEEN_KEY + userId));
      } catch {}
      if (!alive) return;
      setStill(off);
      if (seen && !ALWAYS_SHOW_FOR_TESTING) { setPhase('gone'); return; }
      // Reduce motion means the whole thing is simply there.
      if (off) setShown(BODY.length);
      setPhase('show');
    })();
    return () => { alive = false; };
  }, [userId]);

  useEffect(() => {
    if (phase !== 'show' || still) return;
    if (shown >= BODY.length) return;
    const t = setTimeout(() => setShown((n) => Math.min(BODY.length, n + STEP)), TICK);
    return () => clearTimeout(t);
  }, [phase, shown, still]);

  const done = shown >= BODY.length;

  // The caret only blinks while there is still something to write.
  useEffect(() => {
    if (phase !== 'show' || still || done) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(caret, { toValue: 0, duration: 420, easing: EASE, useNativeDriver: true }),
        Animated.timing(caret, { toValue: 1, duration: 420, easing: EASE, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, still, done, caret]);

  const dismiss = () => {
    if (userId) AsyncStorage.setItem(SEEN_KEY + userId, '1').catch(() => {});
    if (still) { setPhase('gone'); return; }
    Animated.timing(fade, {
      toValue: 0,
      duration: DURATION.reveal,
      easing: EASE,
      useNativeDriver: true,
    }).start(({ finished }) => { if (finished) setPhase('gone'); });
  };

  if (phase !== 'show') return null;

  return (
    <Animated.View style={[styles.fill, { opacity: fade }]}>
      <Image source={SKY} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient colors={SCRIM} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={styles.inner}>
        <Text style={styles.kicker}>MY COMPANION</Text>
        <Text style={styles.h1}>Welcome to your companion</Text>
        <Text style={styles.body}>
          {BODY.slice(0, shown)}
          {!done && !still ? <Animated.Text style={[styles.caret, { opacity: caret }]}>|</Animated.Text> : null}
        </Text>
      </View>
      {done ? (
        <Meet onPress={dismiss} still={still} />
      ) : (
        // The space is held so nothing shifts when the button arrives.
        <View style={styles.btnSpacer} />
      )}
    </Animated.View>
  );
}

// Arrives rather than appearing, once there is nothing left to write.
function Meet({ onPress, still }: { onPress: () => void; still: boolean }) {
  const v = useRef(new Animated.Value(still ? 1 : 0)).current;
  useEffect(() => {
    if (still) return;
    Animated.timing(v, { toValue: 1, duration: DURATION.reveal, easing: EASE, useNativeDriver: true }).start();
  }, [still, v]);
  return (
    <Animated.View
      style={[
        styles.btnWrap,
        { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
      ]}
    >
      <Pressable style={styles.btn} onPress={onPress}>
        <Text style={styles.btnText}>Meet my companion</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.bg, zIndex: 50 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  kicker: { fontSize: 11, letterSpacing: 3, color: COLORS.ink, opacity: 0.55, marginBottom: 14 },
  h1: { fontFamily: FONT_SERIF, fontSize: 34, lineHeight: 41, color: COLORS.ink, marginBottom: 22 },
  body: { fontSize: 16, lineHeight: 26, color: COLORS.ink },
  caret: { fontSize: 16, color: COLORS.ink },
  btnWrap: { paddingHorizontal: 30, paddingBottom: 54 },
  btnSpacer: { height: 54 + 52 + 14 },
  // Ink with cream type, like every other primary button since apply316. A
  // frosted panel would have nothing to sit against on a background this light.
  btn: { paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.ink, alignItems: 'center' },
  btnText: { color: COLORS.bg, fontSize: 16, letterSpacing: 0.5 },
});

export default CompanionIntro;
