// A walk through a screen, one thing at a time.
//
// Everything goes dark except the thing being described, which stays lit
// through a hole made of four rectangles around it. Four plain views rather
// than a mask, because a mask needs a native library and this needs nothing.
//
// Position comes from two measurements working together. Each row reports its
// y inside the scroll as it lays out, which is a plain layout number and
// always right. That is used to scroll the row into view. Only then is it
// measured against the window, which is what the hole needs.
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { DURATION, EASE, reduceMotion } from '@/constants/motion';

export type TourStep = { key: string; title: string; body: string };
export type TourRect = { x: number; y: number; w: number; h: number };

const SCRIM = 'rgba(28,24,20,0.78)';
const PAD = 8;
const CARD_W = 240;
const EDGE = 16;
const BEAK = 12;
// Where a row is parked on screen once scrolled to. High enough that the card
// fits underneath it, low enough that it does not look cut off.
const REST = 0.3;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function Tour({
  steps,
  rects,
  focus,
  onDone,
}: {
  steps: TourStep[];
  rects: Record<string, TourRect | undefined>;
  focus?: (key: string) => void;
  onDone: () => void;
}) {
  const [i, setI] = useState(0);
  const [still, setStill] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const { width: screenW, height: screenH } = Dimensions.get('window');

  useEffect(() => {
    let alive = true;
    reduceMotion().then((off) => { if (alive) setStill(off); });
    return () => { alive = false; };
  }, []);

  const step = steps.length ? steps[i] : null;

  // Scrolls this step into view, then measures. The screen has to stop moving
  // first or the measurement is of where the row used to be.
  useEffect(() => {
    if (step) focus?.(step.key);
  }, [i, step?.key, focus]);

  useEffect(() => {
    if (still) { fade.setValue(1); return; }
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1, duration: DURATION.colour, easing: EASE, useNativeDriver: true,
    }).start();
  }, [i, still, fade]);

  if (!step) return null;

  const last = i === steps.length - 1;
  const r = rects[step.key];
  const below = !r || r.y + r.h / 2 < screenH * 0.5;

  const centreX = r ? r.x + r.w / 2 : screenW / 2;
  const left = clamp(centreX - CARD_W / 2, EDGE, screenW - CARD_W - EDGE);
  const beakLeft = clamp(centreX - left - BEAK / 2, 18, CARD_W - 18 - BEAK);

  const next = () => {
    if (last) { onDone(); return; }
    setI((n) => n + 1);
  };

  // Anywhere dark closes it. A tour you did not want should not be a tour you
  // have to finish.
  const dark = (extra: any) => (
    <Pressable style={[styles.dark, extra]} onPress={onDone} />
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.root}>
        {r ? (
          <>
            {dark({ top: 0, left: 0, right: 0, height: Math.max(0, r.y - PAD) })}
            {dark({ top: r.y + r.h + PAD, left: 0, right: 0, bottom: 0 })}
            {dark({ top: r.y - PAD, left: 0, width: Math.max(0, r.x - PAD), height: r.h + PAD * 2 })}
            {dark({ top: r.y - PAD, left: r.x + r.w + PAD, right: 0, height: r.h + PAD * 2 })}
            <View
              pointerEvents="none"
              style={[styles.ring, { top: r.y - PAD, left: r.x - PAD, width: r.w + PAD * 2, height: r.h + PAD * 2 }]}
            />
          </>
        ) : (
          dark(StyleSheet.absoluteFillObject)
        )}

        <Animated.View
          style={[
            styles.cardWrap,
            { opacity: fade, left, width: CARD_W },
            r
              ? below
                ? { top: r.y + r.h + PAD + 16 }
                : { top: Math.max(EDGE, r.y - PAD - 16 - 168) }
              : { top: screenH * 0.4 },
          ]}
        >
          {r && below ? (
            <>
              <Ionicons name="arrow-up" size={18} color={COLORS.pastel} style={[styles.arrow, { left: beakLeft - 3, top: -22 }]} />
              <View style={[styles.beak, { left: beakLeft, top: -BEAK / 2 }]} />
            </>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.count}>{i + 1} of {steps.length}</Text>
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.body}>{step.body}</Text>
            <View style={styles.row}>
              <Pressable onPress={onDone} hitSlop={12}>
                <Text style={styles.skip}>{last ? '' : 'Skip'}</Text>
              </Pressable>
              <Pressable style={styles.next} onPress={next}>
                <Text style={styles.nextText}>{last ? 'Done' : 'Next'}</Text>
              </Pressable>
            </View>
          </View>

          {r && !below ? (
            <>
              <View style={[styles.beak, { left: beakLeft, bottom: -BEAK / 2 }]} />
              <Ionicons name="arrow-down" size={18} color={COLORS.pastel} style={[styles.arrow, { left: beakLeft - 3, bottom: -22 }]} />
            </>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

// Give it the screen's ScrollView and it will drive the scroll itself.
export function useTour(scrollRef?: any) {
  const nodes = useRef<Record<string, any>>({});
  const ys = useRef<Record<string, number>>({});
  const [rects, setRects] = useState<Record<string, TourRect | undefined>>({});

  const setTarget = (key: string) => (node: any) => {
    if (node) nodes.current[key] = node;
  };

  // Plain layout y inside the scroll content. Reliable, and what the scroll
  // needs. Not what the hole needs, which is why both exist.
  const onTargetLayout = (key: string) => (e: any) => {
    const y = e?.nativeEvent?.layout?.y;
    if (typeof y === 'number') ys.current[key] = y;
  };

  const measure = (key: string) => {
    const node = nodes.current[key];
    if (!node || typeof node.measureInWindow !== 'function') return;
    node.measureInWindow((x: number, y: number, w: number, h: number) => {
      if (!w || !h) return;
      setRects((prev) => {
        const old = prev[key];
        if (old && old.x === x && old.y === y && old.w === w && old.h === h) return prev;
        return { ...prev, [key]: { x, y, w, h } };
      });
    });
  };

  const focus = (key: string) => {
    const y = ys.current[key];
    const sv = scrollRef?.current;
    const { height } = Dimensions.get('window');
    if (sv?.scrollTo && typeof y === 'number') {
      sv.scrollTo({ y: Math.max(0, y - height * REST), animated: true });
    }
    // Twice: once when the scroll should be done, once in case it was not.
    setTimeout(() => measure(key), 420);
    setTimeout(() => measure(key), 720);
  };

  // Called by the screen whenever scrolling stops. A timer can guess wrong
  // about when a scroll has finished; this cannot.
  const remeasure = () => {
    Object.keys(nodes.current).forEach((k) => measure(k));
  };

  return { rects, setTarget, onTargetLayout, focus, remeasure };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dark: { position: 'absolute', backgroundColor: SCRIM },
  ring: { position: 'absolute', borderRadius: 18, borderWidth: 1.5, borderColor: COLORS.pastel },
  cardWrap: { position: 'absolute' },
  arrow: { position: 'absolute' },
  beak: {
    position: 'absolute', width: BEAK, height: BEAK,
    backgroundColor: COLORS.bg, transform: [{ rotate: '45deg' }],
  },
  card: { backgroundColor: COLORS.bg, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 13 },
  count: { fontSize: 9, letterSpacing: 1.8, color: COLORS.muted, marginBottom: 5 },
  title: { fontFamily: FONT_SERIF, fontSize: 15, lineHeight: 20, color: COLORS.ink },
  body: { fontSize: 12, lineHeight: 17, color: COLORS.muted, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  skip: { fontSize: 12, color: COLORS.muted },
  next: { backgroundColor: COLORS.ink, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 18 },
  nextText: { color: COLORS.bg, fontSize: 13, letterSpacing: 0.3 },
});

export default Tour;
