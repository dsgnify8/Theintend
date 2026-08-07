// A walk through a screen, one thing at a time.
//
// Everything goes dark except the thing being described, which stays lit
// through a hole made of four rectangles around it. Four plain views rather
// than a mask, because a mask needs a native library and this needs nothing,
// and because the lit area is then exactly the measured element.
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const { height: screenH } = Dimensions.get('window');

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

  // The target sits in the top half, so the card goes underneath it. Otherwise
  // above, so the card never covers the thing it is describing.
  const below = !r || r.y + r.h / 2 < screenH * 0.5;

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
              style={[
                styles.ring,
                { top: r.y - PAD, left: r.x - PAD, width: r.w + PAD * 2, height: r.h + PAD * 2 },
              ]}
            />
          </>
        ) : (
          // Nothing measured, so no hole. The card still explains the step.
          <View style={[styles.dark, StyleSheet.absoluteFillObject]} />
        )}

        <Animated.View
          style={[
            styles.cardWrap,
            { opacity: fade },
            r
              ? below
                ? { top: r.y + r.h + PAD + 14 }
                : { bottom: screenH - (r.y - PAD) + 14 }
              : { top: screenH * 0.36 },
          ]}
          pointerEvents="box-none"
        >
          {r ? (
            <Ionicons
              name={below ? 'arrow-up' : 'arrow-down'}
              size={20}
              color={COLORS.pastel}
              style={[styles.arrow, below ? { marginBottom: 6 } : { marginTop: 6, order: 2 }]}
            />
          ) : null}

          <View style={styles.card}>
            <Text style={styles.count}>{i + 1} of {steps.length}</Text>
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.body}>{step.body}</Text>

            <View style={styles.row}>
              <Pressable onPress={onDone} hitSlop={10}>
                <Text style={styles.skip}>{last ? '' : 'Skip'}</Text>
              </Pressable>
              <Pressable style={styles.next} onPress={next}>
                <Text style={styles.nextText}>{last ? 'Done' : 'Next'}</Text>
              </Pressable>
            </View>
          </View>
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
  cardWrap: { position: 'absolute', left: 20, right: 20, alignItems: 'center' },
  arrow: { alignSelf: 'center' },
  card: {
    width: '100%',
    backgroundColor: COLORS.bg,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  count: { fontSize: 10, letterSpacing: 2.2, color: COLORS.muted, marginBottom: 8 },
  title: { fontFamily: FONT_SERIF, fontSize: 20, lineHeight: 26, color: COLORS.ink },
  body: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginTop: 7 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  skip: { fontSize: 14, color: COLORS.muted },
  next: { backgroundColor: COLORS.ink, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 26 },
  nextText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.3 },
});

export default Tour;
