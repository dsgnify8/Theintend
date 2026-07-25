import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

// The native splash already shows the wordmark on this same background. This
// layer sits on top in the same colour, holds briefly, then dissolves to reveal
// the app, so the whole intro reads as one continuous moment (splash -> app)
// rather than two separate loading screens.
const BG = '#F4EFEF';
const HOLD_MS = 900;
const FADE_MS = 700;

export function AnimatedIntro({ onDone }: { onDone: () => void }) {
  const o = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(o, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(({ finished }) => {
        if (finished) onDone();
      });
    }, HOLD_MS);
    return () => clearTimeout(t);
  }, []);

  return <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: o }]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  root: { backgroundColor: BG, zIndex: 999, elevation: 999 },
});
