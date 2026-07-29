import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { LIBRARY } from '@/constants/library';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { recordBookOpen, saveBookScroll, getBookScroll } from '@/lib/store';

type Heading = { title: string; top: number };

export default function EbookReader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const item = LIBRARY.find((i) => i.id === id);
  const mod = (item as any)?.pdf ?? (item as any)?.html;
  const [uri, setUri] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const startY = useRef(0);
  const webRef = useRef<WebView>(null);
  const [showHint, setShowHint] = useState(false);
  const [contentsOpen, setContentsOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [meta, setMeta] = useState<{ height: number; vh: number; headings: Heading[] }>({ height: 0, vh: 1, headings: [] });

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

  const pageCount = useMemo(() => (meta.vh > 0 ? Math.max(1, Math.ceil(meta.height / meta.vh)) : 1), [meta]);
  const currentPage = useMemo(() => (meta.vh > 0 ? Math.min(pageCount, Math.floor(scrollY / meta.vh) + 1) : 1), [scrollY, meta, pageCount]);

  const jumpTo = (y: number) => {
    webRef.current?.injectJavaScript(`window.scrollTo(0, ${Math.max(0, Math.round(y))}); true;`);
    setContentsOpen(false);
  };

  // Restore the saved position, then report scroll + document shape back to the app.
  const injected = `
    (function() {
      try {
        var SAVED = ${startY.current || 0};
        function restore() { try { window.scrollTo(0, SAVED); } catch (e) {} }
        function meta() {
          try {
            var h = Math.max(document.body ? document.body.scrollHeight : 0, document.documentElement ? document.documentElement.scrollHeight : 0);
            var vh = window.innerHeight || (document.documentElement && document.documentElement.clientHeight) || 1;
            var heads = [];
            var els = document.querySelectorAll('h1, h2, h3');
            for (var i = 0; i < els.length && i < 120; i++) {
              var t = (els[i].innerText || els[i].textContent || '').trim();
              if (t) heads.push({ title: t.slice(0, 90), top: Math.round((els[i].getBoundingClientRect().top) + (window.scrollY || 0)) });
            }
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'meta', height: h, vh: vh, headings: heads }));
          } catch (e) {}
        }
        restore();
        window.addEventListener('load', function () { restore(); setTimeout(meta, 300); });
        setTimeout(restore, 120); setTimeout(restore, 400); setTimeout(restore, 900);
        setTimeout(meta, 500); setTimeout(meta, 1400);
        var t;
        window.addEventListener('scroll', function () {
          clearTimeout(t);
          t = setTimeout(function () {
            try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'scroll', y: Math.round(window.scrollY || (document.documentElement && document.documentElement.scrollTop) || 0) })); } catch (e) {}
          }, 200);
        }, { passive: true });
      } catch (e) {}
      true;
    })();
  `;

  const onMessage = (e: any) => {
    let d: any;
    try { d = JSON.parse(e.nativeEvent.data); } catch { d = { type: 'scroll', y: Number(e.nativeEvent.data) || 0 }; }
    if (d.type === 'scroll') {
      const y = d.y || 0;
      saveBookScroll(id, y);
      setScrollY(y);
    } else if (d.type === 'meta') {
      setMeta({ height: d.height || 0, vh: d.vh || 1, headings: Array.isArray(d.headings) ? d.headings : [] });
    }
  };

  const hasContents = meta.headings.length > 0 || pageCount > 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Text style={styles.back}>Close</Text></Pressable>
        <Text style={styles.title} numberOfLines={1}>{item?.title ?? 'Reading'}</Text>
        {hasContents ? (
          <Pressable onPress={() => setContentsOpen(true)} hitSlop={12} style={styles.contentsBtn}>
            <Ionicons name="list-outline" size={22} color={COLORS.ink} />
          </Pressable>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      {pageCount > 1 ? (
        <Pressable style={styles.pageChip} onPress={() => setContentsOpen(true)}>
          <Text style={styles.pageChipText}>Page {currentPage} of {pageCount}</Text>
        </Pressable>
      ) : null}

      {showHint ? (
        <View style={styles.hintPill}><Text style={styles.hintText}>Continuing where you left off</Text></View>
      ) : null}

      {err ? (
        <View style={styles.center}><Text style={styles.errText}>{err}</Text></View>
      ) : uri ? (
        <WebView
          ref={webRef}
          source={{ uri }}
          style={styles.web}
          originWhitelist={['*']}
          allowFileAccess
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
          allowingReadAccessToURL={uri}
          injectedJavaScript={injected}
          onMessage={onMessage}
          startInLoadingState
          renderLoading={() => (<View style={styles.center}><ActivityIndicator color={COLORS.accent} /></View>)}
        />
      ) : (
        <View style={styles.center}><ActivityIndicator color={COLORS.accent} /><Text style={styles.loading}>Opening{'\u2026'}</Text></View>
      )}

      <Modal visible={contentsOpen} transparent animationType="slide" onRequestClose={() => setContentsOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setContentsOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Contents</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {meta.headings.length > 0 ? (
                meta.headings.map((h, i) => (
                  <Pressable key={i} style={styles.tocRow} onPress={() => jumpTo(h.top)}>
                    <Text style={styles.tocText} numberOfLines={2}>{h.title}</Text>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
                  </Pressable>
                ))
              ) : (
                Array.from({ length: pageCount }).map((_, i) => {
                  const on = i + 1 === currentPage;
                  return (
                    <Pressable key={i} style={styles.tocRow} onPress={() => jumpTo(i * meta.vh)}>
                      <Text style={[styles.tocText, on && styles.tocOn]}>Page {i + 1}</Text>
                      {on ? <Text style={styles.tocHere}>Here</Text> : <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  contentsBtn: { width: 48, alignItems: 'flex-end' },
  spacer: { width: 48 },
  pageChip: { alignSelf: 'center', backgroundColor: COLORS.accentSoft, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, marginTop: 10 },
  pageChipText: { fontSize: 12, color: COLORS.accent, letterSpacing: 0.5 },
  web: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  loading: { fontSize: 14, color: COLORS.muted, marginTop: 12 },
  errText: { fontSize: 15, color: COLORS.muted, paddingHorizontal: 32, textAlign: 'center' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.35)' },
  sheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 32 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 16 },
  sheetTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginBottom: 12 },
  tocRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderTopWidth: 1, borderTopColor: COLORS.line },
  tocText: { flex: 1, fontSize: 15, color: COLORS.ink, paddingRight: 12 },
  tocOn: { color: COLORS.accent, fontFamily: FONT_SERIF },
  tocHere: { fontSize: 12, color: COLORS.accent, letterSpacing: 0.5 },
});
