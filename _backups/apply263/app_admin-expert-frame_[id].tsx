import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { updateExpert, useExpert } from '@/lib/experts';
import { FramedImage } from '@/components/FramedImage';

export default function AdminExpertFrame() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role } = useAuth();
  const { expert, loading } = useExpert(id);

  const [filled, setFilled] = useState(false);
  const [scale, setScale] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (expert && !filled) {
      setScale(expert.photoScale ?? 1);
      setX(expert.photoX ?? 0);
      setY(expert.photoY ?? 0);
      setFilled(true);
    }
  }, [expert, filled]);

  const save = async () => {
    if (!expert) return;
    setBusy(true);
    setStatus(null);
    const { error } = await updateExpert(expert.id, { photo_scale: scale, photo_x: x, photo_y: y });
    setStatus(error ? `Save failed: ${error.message}` : 'Saved. The new framing is live across the app.');
    setBusy(false);
  };

  const reset = () => { setScale(1); setX(0); setY(0); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.back} onPress={() => router.back()} hitSlop={12}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      {role !== 'admin' ? (
        <View style={styles.center}><Text style={styles.muted}>Admins only.</Text></View>
      ) : loading || !expert ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.accent} /></View>
      ) : !expert.photo ? (
        <View style={styles.center}><Text style={styles.muted}>This expert has no photo yet. Add one first, then adjust the framing.</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>FRAMING</Text>
          <Text style={styles.h1}>{expert.name}</Text>
          <Text style={styles.sub}>Drag the sliders until the photo sits how you want. This is exactly how the card will look.</Text>

          <View style={styles.previewWrap}>
            <FramedImage uri={expert.photo} scale={scale} x={x} y={y} />
          </View>

          <Control label={`Zoom · ${scale.toFixed(2)}x`} value={scale} min={1} max={3} step={0.02} onChange={setScale} />
          <Control label="Move horizontally" value={x} min={-1} max={1} step={0.02} onChange={setX} />
          <Control label="Move vertically" value={y} min={-1} max={1} step={0.02} onChange={setY} />

          {status ? <Text style={styles.status}>{status}</Text> : null}

          <View style={styles.actions}>
            <Pressable onPress={reset}><Text style={styles.reset}>Reset</Text></Pressable>
            <Pressable style={[styles.saveBtn, busy && styles.saveOff]} onPress={save} disabled={busy}>
              {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.saveText}>Save framing</Text>}
            </Pressable>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Control({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.control}>
      <Text style={styles.controlLabel}>{label}</Text>
      <Slider
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={COLORS.accent}
        maximumTrackTintColor={COLORS.line}
        thumbTintColor={COLORS.accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  back: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  muted: { fontSize: 15, color: COLORS.muted, textAlign: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginBottom: 8 },
  h1: { fontFamily: FONT_SERIF, fontSize: 30, color: COLORS.ink },
  sub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginTop: 8, marginBottom: 20 },
  previewWrap: { height: 300, borderRadius: 24, borderWidth: 1, borderColor: COLORS.line, overflow: 'hidden', backgroundColor: COLORS.accentSoft, marginBottom: 24 },
  control: { marginBottom: 18 },
  controlLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  status: { fontSize: 14, color: COLORS.accent, marginTop: 4, marginBottom: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  reset: { fontSize: 15, color: COLORS.muted },
  saveBtn: { backgroundColor: COLORS.accent, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 999 },
  saveOff: { opacity: 0.6 },
  saveText: { color: COLORS.bg, fontSize: 15 },
});
