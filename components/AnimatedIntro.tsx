import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet } from 'react-native';

const FLOWER = require('../assets/images/ti-flower.png');
const LOGO = require('../assets/images/ti-logo.png');
const TAGLINE = require('../assets/images/ti-tagline.png');
const BG = '#E4E2E3';

export function AnimatedIntro({ onDone }: { onDone: () => void }) {
  const logoO = useRef(new Animated.Value(0)).current;
  const tagO = useRef(new Animated.Value(0)).current;
  const tagS = useRef(new Animated.Value(0.82)).current;
  const rootO = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Flower is already on screen. The big logo fades in quickly, then the
    // tagline fades in with a spring pop. Then the whole intro dissolves.
    Animated.sequence([
      Animated.delay(250),
      Animated.timing(logoO, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.delay(160),
      Animated.parallel([
        Animated.timing(tagO, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(tagS, { toValue: 1, friction: 4.5, tension: 150, useNativeDriver: true }),
      ]),
    ]).start();

    const t = setTimeout(() => {
      Animated.timing(rootO, { toValue: 0, duration: 800, useNativeDriver: true }).start(({ finished }) => {
        if (finished) onDone();
      });
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: rootO }]} pointerEvents="none">
      <Image source={FLOWER} resizeMode="cover" style={styles.img} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: logoO }]}>
        <Image source={LOGO} resizeMode="cover" style={styles.img} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: tagO, transform: [{ scale: tagS }] }]}>
        <Image source={TAGLINE} resizeMode="cover" style={styles.img} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: BG, zIndex: 999, elevation: 999 },
  img: { width: '100%', height: '100%', resizeMode: 'cover', position: 'absolute', top: 0, left: 0 },
});
