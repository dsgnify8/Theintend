import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

const INTRO = require('../assets/images/ti-splash.png');
const BG = '#E4E2E3';

export function AnimatedIntro({ onDone }: { onDone: () => void }) {
  const imgOpacity = useRef(new Animated.Value(0)).current;
  const imgScale = useRef(new Animated.Value(1.08)).current;
  const rootOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // The full first screen (flower, logo and tagline) eases in from the launch
    // colour, settles, holds, then the whole intro dissolves into the app.
    Animated.parallel([
      Animated.timing(imgOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(imgScale, { toValue: 1, duration: 2600, useNativeDriver: true }),
    ]).start();

    const t = setTimeout(() => {
      Animated.timing(rootOpacity, { toValue: 0, duration: 800, useNativeDriver: true }).start(({ finished }) => {
        if (finished) onDone();
      });
    }, 2300);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: rootOpacity }]} pointerEvents="none">
      <Animated.Image
        source={INTRO}
        resizeMode="cover"
        style={[StyleSheet.absoluteFill, { opacity: imgOpacity, transform: [{ scale: imgScale }] }]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: BG, zIndex: 999, elevation: 999 },
});
