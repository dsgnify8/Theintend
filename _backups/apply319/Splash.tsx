// The mark, held briefly over the app and then faded out.
//
// The native splash is a static image, so it cannot fade. This takes over the
// moment the native one lifts, matching its background and artwork exactly so
// the handover is invisible.
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet } from 'react-native';
import { DURATION, EASE, reduceMotion } from '@/constants/motion';

// Matches the backgroundColor in app.json. If that changes, change this.
const SPLASH_BG = '#F4EFEF';

// How long the mark is guaranteed to be visible for, whatever the app is doing.
const MIN_VISIBLE = 900;

export function Splash({ onDone }: { onDone?: () => void }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const start = Date.now();

    (async () => {
      const still = await reduceMotion();
      // A minimum, not a delay: whatever the app already spent getting ready
      // counts towards it.
      const waited = Date.now() - start;
      const remaining = Math.max(0, MIN_VISIBLE - waited);

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
  }, [opacity, onDone]);

  if (gone) return null;

  return (
    <Animated.View style={[styles.fill, { opacity }]} pointerEvents="none">
      <Image
        source={require('@/assets/images/splash-logo.png')}
        style={styles.mark}
        resizeMode="contain"
      />
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
});

export default Splash;
