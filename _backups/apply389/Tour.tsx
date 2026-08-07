// A walk through a screen, one thing at a time.
//
// Everything goes dark except the thing being described, which stays lit
// through a hole made of four rectangles around it. Four plain views rather
// than a mask, because a mask needs a native library and this needs nothing,
// and because the lit area is then exactly the measured element.
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { DURATION, EASE, reduceMotion } from '@/constants/motion';

export type TourStep = {
  // Matches a key passed to onTourLayout by the screen.
  key: string;
  title: string;
  body: string;
};

export type TourRect = { x: number; y: number; w: number; h: number };

const SCRIM = 'rgba(28,24,20,0.78)';
const PAD = 8;
const CARD_W = 240;
const EDGE = 16;
const BEAK = 12;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function Tour({
  steps,
  rects,
  onDone,
}: {
  steps: TourStep[];
  rects: Record<string, TourRect | undefined>;
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

  useEffect(() => {
    if (still) { fade.setValue(1); return; }
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: DURATION.colour,
      easing: EASE,
      useNativeDriver: true,
    }).start();
  }, [i, still, fade]);

  if (!steps.length) return null;

  const step = steps[i];
  const last = i === steps.length - 1;
  const r = rects[step.key];

  // Below the target when the target is high on the screen, above when it is
  // low, so the card never covers what it is describing.
  const below = !r || r.y + r.h / 2 < screenH * 0.5;

  // The card is held on screen, and the beak slides along it to keep pointing
  // at the right place. A row near an edge would otherwise push it half off.
  const centreX = r ? r.x + r.w / 2 : screenW / 2;
  const left = clamp(centreX - CARD_W / 2, EDGE, screenW - CARD_W - EDGE);
  const beakLeft = clamp(centreX - left - BEAK / 2, 18, CARD_W - 18 - BEAK);

  const next = () => {
    if (last) { onDone(); return; }
    setI((n) => n + 1);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.root}>
        {r ? (
          <>
            {/* Four pieces of dark, leaving the target lit. */}
            <View style={[styles.dark, { top: 0, left: 0, right: 0, height: Math.max(0, r.y - PAD) }]} />
            <View style={[styles.dark, { top: r.y + r.h + PAD, left: 0, right: 0, bottom: 0 }]} />
            <View style={[styles.dark, { top: r.y - PAD, left: 0, width: Math.max(0, r.x - PAD), height: r.h + PAD * 2 }]} />
            <View style={[styles.dark, { top: r.y - PAD, left: r.x + r.w + PAD, right: 0, height: r.h + PAD * 2 }]} />
            <View
              pointerEvents="none"
              style={[styles.ring, { top: r.y - PAD, left: r.x - PAD, width: r.w + PAD * 2, height: r.h + PAD * 2 }]}
            />
          </>
        ) : (
          // Nothing measured, so no hole. The card still explains the step.
          <View style={[styles.dark, StyleSheet.absoluteFillObject]} />
        )}

        <Animated.View
          style={[
            styles.cardWrap,
            { opacity: fade, left, width: CARD_W },
            r
              ? below
                ? { top: r.y + r.h + PAD + 10 }
                : { top: Math.max(EDGE, r.y - PAD - 10 - 150) }
              : { top: screenH * 0.4 },
          ]}
        >
          {r && below ? <View style={[styles.beak, { left: beakLeft, top: -BEAK / 2 }]} /> : null}

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

          {r && !below ? <View style={[styles.beak, { left: beakLeft, bottom: -BEAK / 2 }]} /> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

// Collects where each named row ended up, for the overlay to point at.
// Measured in window coordinates, so a scrolled screen still lines up.
export function useTourRects() {
  const [rects, setRects] = useState<Record<string, TourRect | undefined>>({});
  const onTourLayout = (key: string) => (e: any) => {
    const t = e?.nativeEvent?.target;
    if (!t) return;
    // measureInWindow rather than the layout event, since the event gives a
    // position relative to the parent and the overlay covers the screen.
    if (typeof t.measureInWindow === 'function') {
      t.measureInWindow((x: number, y: number, w: number, h: number) => {
        if (!w || !h) return;
        setRects((prev) => ({ ...prev, [key]: { x, y, w, h } }));
      });
    }
  };
  return { rects, onTourLayout };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dark: { position: 'absolute', backgroundColor: SCRIM },
  ring: { position: 'absolute', borderRadius: 18, borderWidth: 1.5, borderColor: COLORS.pastel },

  cardWrap: { position: 'absolute' },
  // A square turned 45 degrees rather than a border triangle, so it can take
  // the card's own background and the two always match.
  beak: {
    position: 'absolute',
    width: BEAK,
    height: BEAK,
    backgroundColor: COLORS.bg,
    transform: [{ rotate: '45deg' }],
  },
  card: {
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  count: { fontSize: 9, letterSpacing: 1.8, color: COLORS.muted, marginBottom: 5 },
  title: { fontFamily: FONT_SERIF, fontSize: 15, lineHeight: 20, color: COLORS.ink },
  body: { fontSize: 12, lineHeight: 17, color: COLORS.muted, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  skip: { fontSize: 12, color: COLORS.muted },
  next: { backgroundColor: COLORS.ink, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 18 },
  nextText: { color: COLORS.bg, fontSize: 13, letterSpacing: 0.3 },
});

export default Tour;
