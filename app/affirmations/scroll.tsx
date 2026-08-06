import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Dimensions, Modal, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Share, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { EASE } from '@/constants/motion';
import { useAuth } from '@/lib/auth';
import {
  type Affirmation, type Category,
  getCategories, generateBatch, getLiked, likeItem, loadFeed,
  LIB_PREFIX, markLibrarySeen,
} from '@/lib/affirmations';

const { height: H } = Dimensions.get('window');

export default function AffirmationsScroll() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ category?: string }>();
  const [category, setCategory] = useState<string>(params.category ?? 'self-love');
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Affirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [likedView, setLikedView] = useState(false);
  const [warming, setWarming] = useState(false);

  // Categories loaded this session, kept so returning to one is instant.
  const cacheRef = useRef<Record<string, Affirmation[]>>({});

  useEffect(() => { getCategories().then(setCats).catch(() => {}); }, []);

  const load = useCallback(async (cat: string) => {
    if (!user) return;
    const cached = cacheRef.current[cat];
    if (cached && cached.length) {
      // Already have it: show at once, no spinner, no fetch.
      setItems(cached);
      setIndex(0);
      setLoading(false);
      setWarming(false);
      return;
    }
    // The curated pool is public and quick, so this is the normal path and it
    // does not wait on anything being written for this person.
    setIndex(0);
    setLoading(true);
    const list = await loadFeed(user.id, cat);
    cacheRef.current[cat] = list;
    setItems(list);
    setLoading(false);
    // Only an empty pool leaves us with nothing to show, and only then does
    // generation become the thing being waited on.
    if (list.length === 0) {
      setWarming(true);
      try {
        await generateBatch(cat);
        const grown = await loadFeed(user.id, cat);
        cacheRef.current[cat] = grown;
        setItems(grown);
      } catch {}
      setWarming(false);
    }
  }, [user]);

  // Pool lines are recorded as they are reached, so a return visit brings ones
  // they have not read. Batched, and flushed on leaving so nothing is lost.
  const pendingSeenRef = useRef<string[]>([]);
  const flushSeen = useCallback(() => {
    if (!user) return;
    const ids = pendingSeenRef.current;
    if (!ids.length) return;
    pendingSeenRef.current = [];
    markLibrarySeen(user.id, ids);
  }, [user]);

  useEffect(() => {
    if (likedView || !user) return;
    const it = items[index];
    if (!it || !it.id.startsWith(LIB_PREFIX)) return;
    const libId = it.id.slice(LIB_PREFIX.length);
    if (pendingSeenRef.current.includes(libId)) return;
    pendingSeenRef.current.push(libId);
    if (pendingSeenRef.current.length >= 3) flushSeen();
  }, [index, items, likedView, user, flushSeen]);

  // Leaving the screen, or switching category, writes whatever is pending.
  useEffect(() => () => { flushSeen(); }, [flushSeen]);
  useEffect(() => { flushSeen(); }, [category, flushSeen]);

  // Top up ahead of the person. New lines are appended rather than merged in
  // place, so nothing they are looking at moves.
  const toppingRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (likedView || !user || items.length === 0) return;
    if (index < items.length - 5) return;
    if (toppingRef.current[category]) return;
    toppingRef.current[category] = true;
    (async () => {
      try {
        await generateBatch(category);
        const fresh = await loadFeed(user.id, category);
        setItems((prev) => {
          const have = new Set(prev.map((x) => x.text));
          const add = fresh.filter((f) => !have.has(f.text));
          if (!add.length) return prev;
          const next = [...prev, ...add];
          cacheRef.current[category] = next;
          return next;
        });
      } catch {}
      toppingRef.current[category] = false;
    })();
  }, [index, items.length, category, likedView, user]);

  useEffect(() => { if (!likedView) load(category); }, [category, load, likedView]);

  const openLiked = useCallback(async () => {
    if (!user) return;
    setLikedView(true);
    setLoading(true);
    const list = await getLiked(user.id);
    setItems(list);
    setIndex(0);
    setLoading(false);
  }, [user]);

  const exitLiked = useCallback(() => {
    setLikedView(false);
    load(category);
  }, [category, load]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / H);
    if (i !== index) setIndex(i);
  };

  const current = items[index];
  const catLabel = cats.find((c) => c.id === category)?.label ?? '';

  const [burst, setBurst] = useState(0);

  const like = async () => {
    if (!current || !user) return;
    const next = !current.liked;
    // Only on the way in. Nothing celebrates an unlike.
    if (next) setBurst((n) => n + 1);
    const wasId = current.id;
    setItems((arr) => arr.map((a) => (a.id === wasId ? { ...a, liked: next } : a)));
    const c = cacheRef.current[category];
    if (c) cacheRef.current[category] = c.map((a) => (a.id === wasId ? { ...a, liked: next } : a));
    try {
      // A pool line gets a personal copy on its first like, and takes on the
      // id of that copy so unliking later works normally.
      const newId = await likeItem(user.id, current, next);
      if (newId !== wasId) {
        setItems((arr) => arr.map((a) => (a.id === wasId ? { ...a, id: newId } : a)));
        const c2 = cacheRef.current[category];
        if (c2) cacheRef.current[category] = c2.map((a) => (a.id === wasId ? { ...a, id: newId } : a));
      }
    } catch {}
  };

  const share = async () => {
    if (!current) return;
    try { await Share.share({ message: `${current.text}\n\nvia The Intend` }); } catch {}
  };

  const pickCategory = (id: string) => { setPickerOpen(false); if (id !== category) setCategory(id); };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text style={styles.loadingText}>Bringing your affirmations</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>{likedView ? 'No favorites yet. Tap the heart on an affirmation to keep it here.' : 'We could not load these just now.'}</Text>
          <Pressable style={styles.retry} onPress={() => (likedView ? exitLiked() : load(category))}>
            <Text style={styles.retryText}>{likedView ? 'Back to affirmations' : 'Try again'}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollPager onScroll={onScroll} items={items} />
      )}

      {warming && items.length === 0 ? (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Writing your {catLabel.toLowerCase()} affirmations</Text>
        </View>
      ) : null}

      {/* top bar: progress of liked in this set */}
      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <Pressable style={styles.corner} onPress={() => (likedView ? exitLiked() : router.back())} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </Pressable>
        {likedView ? (
          <Pressable onPress={() => exitLiked()} hitSlop={8} style={styles.likedTag}>
            <Ionicons name="heart" size={14} color={COLORS.accent} />
            <Text style={styles.likedTagText}>Favorites</Text>
            <Ionicons name="close" size={15} color={COLORS.muted} />
          </Pressable>
        ) : (
          <Pressable style={styles.heartTop} onPress={openLiked} hitSlop={10}>
            <Ionicons name="heart" size={20} color={COLORS.accent} />
          </Pressable>
        )}
        <View style={styles.corner} />
      </SafeAreaView>

      {/* bottom controls */}
      {!loading && items.length > 0 ? (
        <SafeAreaView edges={['bottom']} style={styles.bottomBar} pointerEvents="box-none">
          <View style={styles.actions}>
            <Pressable style={styles.actionBtn} onPress={share} hitSlop={12}>
              <Ionicons name="share-outline" size={26} color={COLORS.ink} />
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={like} hitSlop={12}>
              <HeartBurst trigger={burst} />
              <Ionicons name={current?.liked ? 'heart' : 'heart-outline'} size={28} color={current?.liked ? COLORS.accent : COLORS.ink} />
            </Pressable>
          </View>
          {!likedView ? (
            <Pressable style={styles.moodBtn} onPress={() => setPickerOpen(true)}>
              <Ionicons name="grid-outline" size={18} color={COLORS.ink} />
              <Text style={styles.moodText}>{catLabel}</Text>
            </Pressable>
          ) : null}
        </SafeAreaView>
      ) : null}

      {/* category / mood switcher */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)} />
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Change the mood</Text>
            <Text style={styles.sheetSub}>Pick a direction and the affirmations follow.</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.catGrid}>
              {cats.map((c) => {
                const on = c.id === category;
                const ready = !!cacheRef.current[c.id];
                return (
                  <Pressable key={c.id} onPress={() => pickCategory(c.id)} style={[styles.catCard, on && styles.catCardOn]}>
                    <View style={styles.catCardTop}>
                      <Text style={[styles.catCardLabel, on && styles.catCardLabelOn]} numberOfLines={1}>{c.label}</Text>
                      {on ? <Ionicons name="checkmark-circle" size={18} color={COLORS.bg} /> : ready ? <Ionicons name="ellipse" size={7} color={COLORS.accent} /> : null}
                    </View>
                    {c.tone ? <Text style={[styles.catCardTone, on && styles.catCardToneOn]} numberOfLines={2}>{c.tone}</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

// Full-screen vertical pager: one affirmation per screen.
function ScrollPager({ items, onScroll }: { items: Affirmation[]; onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void }) {
  return (
    <ScrollView
      style={StyleSheet.absoluteFill}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      snapToInterval={H}
      decelerationRate="fast"
    >
      {items.map((a) => (
        <View key={a.id} style={[styles.page, { height: H }]}>
          <Text style={styles.affirmation}>{a.text}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// Five hearts, staggered, drifting apart as they rise and fade. Sits over the
// button and takes no touches, so the button underneath still works.
const FLOAT = [
  { x: -26, delay: 0, size: 11 },
  { x: -12, delay: 70, size: 14 },
  { x: 2, delay: 40, size: 16 },
  { x: 16, delay: 110, size: 12 },
  { x: 28, delay: 160, size: 10 },
];

function HeartBurst({ trigger }: { trigger: number }) {
  const vals = useRef(FLOAT.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!trigger) return;
    vals.forEach((v, i) => {
      v.setValue(0);
      Animated.timing(v, {
        toValue: 1,
        duration: 950,
        delay: FLOAT[i].delay,
        easing: EASE,
        useNativeDriver: true,
      }).start();
    });
  }, [trigger, vals]);

  if (!trigger) return null;

  return (
    <View style={styles.burst} pointerEvents="none">
      {FLOAT.map((f, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            opacity: vals[i].interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateY: vals[i].interpolate({ inputRange: [0, 1], outputRange: [0, -74] }) },
              { translateX: vals[i].interpolate({ inputRange: [0, 1], outputRange: [0, f.x] }) },
              { scale: vals[i].interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1, 0.85] }) },
            ],
          }}
        >
          <Ionicons name="heart" size={f.size} color={COLORS.accent} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  loadingText: { fontSize: 15, color: COLORS.muted, marginTop: 16 },
  emptyText: { fontSize: 15, color: COLORS.muted, textAlign: 'center' },
  retry: { marginTop: 16, backgroundColor: COLORS.taupeBlue, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 26 },
  retryText: { color: COLORS.bg, fontSize: 14 },

  page: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  affirmation: { fontFamily: FONT_SERIF, fontSize: 34, lineHeight: 46, color: COLORS.ink, textAlign: 'center' },

  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  corner: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heartTop: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', marginTop: 4, shadowColor: '#2B2622', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  likedTag: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: COLORS.card, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, marginTop: 4 },
  likedTagText: { fontSize: 13, color: COLORS.ink },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: 8 },
  actions: { flexDirection: 'row', gap: 44, marginBottom: 18 },
  burst: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  actionBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  moodBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.card, paddingVertical: 11, paddingHorizontal: 20, borderRadius: 999, shadowColor: '#2B2622', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  moodText: { fontSize: 14, color: COLORS.ink },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.35)' },
  sheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 16 },
  sheetTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink },
  sheetSub: { fontSize: 14, color: COLORS.muted, marginTop: 6, marginBottom: 18 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 8 },
  catCard: { width: '48.5%', minHeight: 62, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card, padding: 12, marginBottom: 9 },
  catCardOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  catCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catCardLabel: { flex: 1, fontFamily: FONT_SERIF, fontSize: 15, color: COLORS.ink },
  catCardLabelOn: { color: COLORS.bg },
  catCardTone: { fontSize: 11, lineHeight: 15, color: COLORS.muted, marginTop: 5 },
  catCardToneOn: { color: COLORS.bg, opacity: 0.85 },
});

