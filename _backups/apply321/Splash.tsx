// The mark, held briefly over the app with a line under it, then faded out.
//
// The native splash is a static image, so it cannot animate. This takes over
// the moment the native one lifts, matching its background and artwork exactly
// so the handover is invisible. Because the mark is already on screen by then,
// it drifts rather than arriving. The line underneath is what arrives.
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text } from 'react-native';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { DURATION, EASE, reduceMotion } from '@/constants/motion';

// Matches the backgroundColor in app.json. If that changes, change this.
const SPLASH_BG = '#F4EFEF';

const TAGLINE = 'Your space to heal, think, and grow';

// How long the mark is guaranteed to be visible for, whatever the app is
// doing. The fade out happens after this, so the whole thing is this plus
// DURATION.reveal.
const MIN_VISIBLE = 1400;

// The line waits a beat so it reads as arriving rather than as part of the
// handover.
const LINE_DELAY = 300;

export function Splash({ onDone }: { onDone?: () => void }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const line = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const start = Date.now();

    (async () => {
      const still = await reduceMotion();
      if (cancelled) return;

      if (still) {
        // No movement at all: the line is simply present.
        line.setValue(1);
      } else {
        // Starts at exactly the native state, so nothing jumps.
        Animated.timing(drift, {
          toValue: 1,
          duration: MIN_VISIBLE + DURATION.reveal,
          easing: EASE,
          useNativeDriver: true,
        }).start();

        Animated.sequence([
          Animated.delay(LINE_DELAY),
          Animated.timing(line, {
            toValue: 1,
            duration: DURATION.reveal,
            easing: EASE,
            useNativeDriver: true,
          }),
        ]).start();
      }

      // A minimum, not a delay: whatever the app already spent getting ready
      // counts towards it.
      const remaining = Math.max(0, MIN_VISIBLE - (Date.now() - start));

      setTimeout(() => {
        if (cancelled) return;
        if (still) {
          setGone(true);
          onDone?.();
          return;
        }
        Animated.timing(opacity, {
          toValue: 0,
          duration: DURATION.reveal,
          easing: EASE,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished && !cancelled) {
            setGone(true);
            onDone?.();
          }
        });
      }, remaining);
    })();

    return () => { cancelled = true; };
  }, [opacity, line, drift, onDone]);

  if (gone) return null;

  return (
    <Animated.View style={[styles.fill, { opacity }]} pointerEvents="none">
      <Animated.Image
        source={require('@/assets/images/splash-logo.png')}
        style={[
          styles.mark,
          { transform: [{ scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }] },
        ]}
        resizeMode="contain"
      />
      <Animated.View
        style={{
          opacity: line,
          transform: [{ translateY: line.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        }}
      >
        <Text style={styles.line}>{TAGLINE}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  // 200 wide, matching imageWidth in app.json, so the mark does not change
  // size as one splash hands over to the other.
  mark: { width: 200, height: 84 },
  line: {
    fontFamily: FONT_SERIF,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 40,
  },
});

export default Splash;
