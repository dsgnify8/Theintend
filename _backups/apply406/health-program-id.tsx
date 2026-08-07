import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT_ITALIC, FONT_SERIF } from '@/constants/brand';
import { DURATION, EASE } from '@/constants/motion';
import {
  healthProgram,
  HEALTH_PROGRAM_AUTHOR,
  HEALTH_PROGRAM_CONSULT_ROUTE,
  HEALTH_PROGRAM_PRICE_USD,
  PREVIEW_STOP,
} from '@/constants/healthPrograms';
import { buyProgram, recordProgramPurchase, useOwnedPrograms } from '@/lib/programs';
import { recordProgramOpen, saveProgramPct } from '@/lib/store';

// Reports how far down the page someone is, so the card can arrive once they
// have seen a whole screen of it.
const WATCH = `
(function(){
  function post(o){ try { window.ReactNativeWebView.postMessage(JSON.stringify(o)); } catch(e){} }
  var last = -999;
  function send(){
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    if (Math.abs(y - last) < 24) return;
    last = y;
    post({ y: y, vh: window.innerHeight || 1, height: document.body.scrollHeight || 0 });
  }
  send();
  window.addEventListener('scroll', send, { passive: true });
})();
true;
`;

const SHEET_WASH = ['rgba(36,31,27,0.0)', 'rgba(36,31,27,0.55)', 'rgba(36,31,27,0.92)'];

export default function HealthProgramReader() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const program = healthProgram(id);
  const owned = useOwnedPrograms();

  const [gateOpen, setGateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(0)).current;

  const isOwned = !!id && owned.ids.includes(String(id));

  // Only once it is theirs. Looking at a preview is not starting something.
  useEffect(() => {
    if (isOwned && program) recordProgramOpen(program.id, program.title);
  }, [isOwned, program?.id]);

  const openGate = () => {
    if (gateOpen) return;
    setGateOpen(true);
    Animated.timing(fade, { toValue: 1, duration: DURATION.reveal, easing: EASE, useNativeDriver: true }).start();
  };

  // Owning it after a purchase closes the gate without a reload.
  useEffect(() => {
    if (isOwned && gateOpen) {
      Animated.timing(fade, { toValue: 0, duration: DURATION.colour, easing: EASE, useNativeDriver: true })
        .start(({ finished }) => { if (finished) setGateOpen(false); });
    }
  }, [isOwned, gateOpen, fade]);

  const onMessage = (e: any) => {
    // Owned, so nothing to gate. Keep how far they have read instead.
    if (isOwned) {
      try {
        const d = JSON.parse(e?.nativeEvent?.data ?? '{}');
        if (typeof d?.y === 'number' && typeof d?.height === 'number' && typeof d?.vh === 'number') {
          const reach = d.height - d.vh;
          if (reach > 0 && id) saveProgramPct(String(id), d.y / reach);
        }
      } catch {}
      return;
    }
    try {
      const d = JSON.parse(e?.nativeEvent?.data ?? '{}');
      if (typeof d?.y !== 'number') return;
      // A whole screen read before being asked for anything.
      if (d.y > (d.vh || 1) * PREVIEW_STOP) openGate();
    } catch {}
  };

  const buy = async () => {
    if (!id) return;
    setBusy(true);
    setNote(null);
    const res = await buyProgram(String(id));
    if (res.ok) {
      await recordProgramPurchase({ programId: String(id) });
      await owned.reload();
      setBusy(false);
      return;
    }
    setBusy(false);
    setNote(res.reason ?? 'That did not go through. Try again in a moment.');
  };

  if (!program) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Back onPress={() => router.back()} />
        <Text style={styles.missing}>That program is not here.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Back onPress={() => router.back()} />

      <WebView
        source={program.html}
        style={styles.web}
        injectedJavaScript={WATCH}
        onMessage={onMessage}
        originWhitelist={['*']}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}><ActivityIndicator color={COLORS.accent} /></View>
        )}
      />

      {gateOpen && !isOwned ? (
        <Animated.View style={[StyleSheet.absoluteFill, styles.gate, { opacity: fade }]}>
          <LinearGradient colors={SHEET_WASH} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <View style={styles.card}>
            <Text style={styles.cardKicker}>{program.focus.toUpperCase()}</Text>
            <Text style={styles.cardTitle}>{program.title}</Text>
            <Text style={styles.cardBody}>
              The rest of this program is yours once. Every week, what to take, what to eat, what
              to watch for. Written by {HEALTH_PROGRAM_AUTHOR}.
            </Text>

            <View style={styles.priceRow}>
              <Text style={styles.price}>${HEALTH_PROGRAM_PRICE_USD}</Text>
              <Text style={styles.priceNote}>one payment, yours to keep</Text>
            </View>

            {note ? <Text style={styles.note}>{note}</Text> : null}

            <Pressable style={[styles.buyBtn, busy && { opacity: 0.6 }]} disabled={busy} onPress={buy}>
              {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.buyText}>Buy this program</Text>}
            </Pressable>
            <Pressable style={styles.consultBtn} onPress={() => router.push(HEALTH_PROGRAM_CONSULT_ROUTE)}>
              <Text style={styles.consultBtnText}>Book personalised consultation</Text>
              <Text style={styles.consultBtnNote}>
                {HEALTH_PROGRAM_AUTHOR.replace('Dr. ', '')} walks you through it and helps you get what is in it
              </Text>
            </Pressable>

            <Pressable style={styles.leaveBtn} onPress={() => router.back()} hitSlop={8}>
              <Text style={styles.leaveText}>Not now</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  );
}

function Back({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.backBar} onPress={onPress} hitSlop={12}>
      <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
      <Text style={styles.backText}>Programs</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  web: { flex: 1, backgroundColor: COLORS.bg },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  missing: { padding: 24, fontSize: 15, color: COLORS.muted },

  gate: { justifyContent: 'flex-end' },
  card: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 26,
    paddingTop: 26,
    paddingBottom: 34,
  },
  cardKicker: { fontSize: 10, letterSpacing: 2.4, color: COLORS.muted, marginBottom: 10 },
  cardTitle: { fontFamily: FONT_SERIF, fontSize: 26, lineHeight: 32, color: COLORS.ink },
  cardBody: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginTop: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 20 },
  price: { fontFamily: FONT_SERIF, fontSize: 30, color: COLORS.ink },
  priceNote: { fontSize: 12, color: COLORS.muted },
  note: { fontSize: 13, lineHeight: 19, color: COLORS.accent, marginTop: 14 },
  buyBtn: { marginTop: 20, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.ink, alignItems: 'center' },
  buyText: { color: COLORS.bg, fontSize: 16, letterSpacing: 0.4 },
  consultBtn: { marginTop: 10, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', backgroundColor: 'transparent' },
  consultBtnText: { fontSize: 14, color: COLORS.ink, letterSpacing: 0.2 },
  consultBtnNote: { fontFamily: FONT_ITALIC, fontSize: 12, lineHeight: 16, color: COLORS.muted, textAlign: 'center', marginTop: 3 },
  leaveBtn: { marginTop: 14, alignItems: 'center' },
  leaveText: { fontSize: 14, color: COLORS.muted },
});
