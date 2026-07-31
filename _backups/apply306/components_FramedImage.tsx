import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

// Shows an image inside a frame with a saved zoom + position so a photo can be
// re-centred without re-cropping. x and y are fractions (-1..1) of the frame;
// scale is a zoom multiplier (1 = fit/cover).
export function FramedImage({
  uri,
  scale = 1,
  x = 0,
  y = 0,
  radius = 0,
  style,
}: {
  uri: string;
  scale?: number;
  x?: number;
  y?: number;
  radius?: number;
  style?: any;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const tx = x * size.w * 0.5;
  const ty = y * size.h * 0.5;
  return (
    <View
      style={[styles.frame, { borderRadius: radius }, style]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <Image
        source={{ uri }}
        resizeMode="cover"
        style={[styles.img, { transform: [{ translateX: tx }, { translateY: ty }, { scale }] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', height: '100%', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
});
