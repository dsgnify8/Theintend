import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { LIBRARY } from '@/constants/library';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { recordBookOpen, saveBookScroll, getBookScroll } from '@/lib/store';

export default function EbookReader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const item = LIBRARY.find((i) => i.id === id);
  const mod = (item as any)?.pdf ?? (item as any)?.html;
  const [uri, setUri] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const startY = useRef(0);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (id && item) recordBookOpen(id, item.title);
  }, [id]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!mod) { setErr('This book is not available yet.'); return; }
        startY.current = getBookScroll(id);
        const asset = Asset.fromModule(mod);
        await asset.downloadAsync();
        if (active) setUri(asset.localUri ?? asset.uri);
      } catch (e: any) {
        if (active) setErr(e?.message ?? 'Could not open the book.');
      }
    })();
    return () => { active = false; };
  }, [mod]);

  useEffect(() => {
    if (uri && startY.current > 40) {
      setShowHint(true);
      const h = setTimeout(() => setShowHint(false), 2600);
      return () => clearTimeout(h);
    }
  }, [uri]);

  // Restore the saved position, then report scroll changes back to the app.
  const injected = `
    (function() {
      try {
        var SAVED = ${startY.current || 0};
        function restore() { try { window.scrollTo(0, SAVED); } catch (e) {} }
        restore();
        window.addEventListener('load', restore);
        setTimeout(restore, 120);
        setTimeout(restore, 400);
        setTimeout(restore, 900);
        var t;
        window.addEventListener('scroll', function() {
          clearTimeout(t);
          t = setTimeout(function() {
            try { window.ReactNativeWebView.postMessage(String(Math.round(window.scrollY || (document.documentElement && document.documentElement.scrollTop) || 0))); } catch (e) {}
          }, 250);
        }, { passive: true });
      } catch (e) {}
      true;
    })();
  `;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Text style={styles.back}>Close</Text></Pressable>
        <Text style={styles.title} numberOfLines={1}>{item?.title ?? 'Reading'}</Text>
        <View style={styles.spacer} />
      </View>
      {showHint ? (
        <View style={styles.hintPill}><Text style={styles.hintText}>Continuing where you left off</Text></View>
      ) : null}
      {err ? (
        <View style={styles.center}><Text style={styles.errText}>{err}</Text></View>
      ) : uri ? (
        <WebView
          source={{ uri }}
          style={styles.web}
          originWhitelist={['*']}
          allowFileAccess
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
          allowingReadAccessToURL={uri}
          injectedJavaScript={injected}
          onMessage={(e) => saveBookScroll(id, Number(e.nativeEvent.data) || 0)}
          startInLoadingState
          renderLoading={() => (<View style={styles.center}><ActivityIndicator color={COLORS.accent} /></View>)}
        />
      ) : (
        <View style={styles.center}><ActivityIndicator color={COLORS.accent} /><Text style={styles.loading}>Opening…</Text></View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  hintPill: { alignSelf: 'center', backgroundColor: COLORS.ink, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, marginTop: 10 },
  hintText: { color: COLORS.bg, fontSize: 12 },
  back: { fontSize: 16, color: COLORS.ink, width: 48 },
  title: { flex: 1, textAlign: 'center', fontFamily: FONT_SERIF, fontSize: 17, color: COLORS.ink },
  spacer: { width: 48 },
  web: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  loading: { fontSize: 14, color: COLORS.muted, marginTop: 12 },
  errText: { fontSize: 15, color: COLORS.muted, paddingHorizontal: 32, textAlign: 'center' },
});

