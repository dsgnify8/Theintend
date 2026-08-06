// What is playing, wherever you are in the app.
//
// A centred pill rather than a full width bar. Full width would sit on top of
// the notification bell, the settings gear and every back button there is. This
// leaves both corners clear.
//
// Swiping up hides it. It does not stop the sound, because those are different
// things and the pause button is right here. It returns when a new track starts.
import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/brand';
import { DURATION, EASE } from '@/constants/motion';
import { togglePlay, usePlayerStatus } from '@/lib/player';

export function MiniPlayer() {
  const status = usePlayerStatus();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const y = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  // Which track was swiped away. A different one brings the bar back.
  const [hiddenFor, setHiddenFor] = useState<string | null>(null);

  const id = status.id;

  useEffect(() => {
    if (id && hiddenFor && id !== hiddenFor) {
      setHiddenFor(null);
      y.setValue(0);
      fade.setValue(1);
    }
  }, [id, hiddenFor, y, fade]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(y, { toValue: -90, duration: DURATION.colour, easing: EASE, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: DURATION.colour, easing: EASE, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) setHiddenFor(id); });
  };

  const pan = useRef(
    PanResponder.create({
      // Upward and deliberate only, so a tap still reaches the buttons.
      onMoveShouldSetPanResponder: (_e, g) => g.dy < -6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => { if (g.dy < 0) y.setValue(g.dy); },
      onPanResponderRelease: (_e, g) => {
        if (g.dy < -28) hide();
        else Animated.timing(y, { toValue: 0, duration: 160, easing: EASE, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        Animated.timing(y, { toValue: 0, duration: 160, easing: EASE, useNativeDriver: true }).start();
      },
    }),
  ).current;

  if (!id || hiddenFor === id) return null;

  return (
    // box-none, so anything not on the pill itself still receives taps.
    <View style={[styles.layer, { top: insets.top + 8 }]} pointerEvents="box-none">
      <Animated.View
        style={[styles.pill, { opacity: fade, transform: [{ translateY: y }] }]}
        {...pan.panHandlers}
      >
        <Pressable style={styles.body} onPress={() => router.push(`/sound/${id}`)} hitSlop={4}>
          <Ionicons name="musical-notes" size={14} color={COLORS.ink} />
          <Text style={styles.title} numberOfLines={1}>{status.title || 'Playing'}</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={togglePlay} hitSlop={10}>
          <Ionicons name={status.playing ? 'pause' : 'play'} size={16} color={COLORS.ink} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 40 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '76%',
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 999,
    // Enough to read against, light enough to see the page through.
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#2B2622',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  body: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  title: { fontSize: 13, color: COLORS.ink, flexShrink: 1 },
  btn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});

export default MiniPlayer;
