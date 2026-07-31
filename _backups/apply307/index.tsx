import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from '@/components/Img';
import Svg, { Circle, Path } from 'react-native-svg';
import { MOODS, levelForKeyword } from '@/constants/mood';
import { setMoodToday, useMoodPicker, useTodayMood } from '@/lib/mood';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { COLORS, FONT_ITALIC, FONT_SERIF, USER } from '@/constants/brand';
import { useArticles } from '@/lib/articles';
import { CLASSES, PROGRAMS } from '@/constants/sessions';
import { EXPERTS } from '@/constants/experts';
import { useExperts } from '@/lib/experts';
import { SLOT_HOME_ARTICLES, SLOT_HOME_EXPERTS, useFeaturedList } from '@/lib/featured';
import { HIGHLIGHTS } from '@/constants/highlights';
import { formatWhenLocal } from '@/lib/bookings';
import { useBookings, useProgress, useUpcomingBookings } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { snippetOfDay } from '@/constants/ebookSnippets';
import { LIBRARY } from '@/constants/library';
import { quoteOfDay } from '@/lib/quoteOfDay';

// Hours 0 to 4 are late night rather than early morning, so they read as
// evening. Morning starts at 5.
function greeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 18) return 'Good afternoon';
  return 'Good evening';
}

const SKY = require('@/assets/images/home-sky.jpg');

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 40;

// Every e-book, newest first. Read times are scaled the same way across all
// three, so they are honest about relative length.
const BOOKS = [
  {
    id: 'quiet-engine',
    tag: 'GUT HEALTH',
    time: '25 min read',
    title: 'The Quiet Engine',
    blurb: 'What gut health actually means, and how far it reaches into mood, skin and hormones.',
    cover: require('@/assets/ebooks/covers/cover-quiet-engine.jpg'),
  },
  {
    id: 'longevity',
    tag: 'LONGEVITY',
    time: '20 min read',
    title: 'The Long Way Home to Your Own Body',
    blurb: 'How the body ages, what genuinely slows it, and the daily choices that carry the most weight.',
    cover: require('@/assets/ebooks/covers/cover-longevity.jpg'),
  },
  {
    id: 'hormones',
    tag: 'HORMONES',
    time: '25 min read',
    title: 'The Wisdom of Her Body',
    blurb: 'How the hormonal system works, what shifts it, and how to read your own cycle.',
    cover: require('@/assets/ebooks/covers/cover-hormones.jpg'),
  },
];
const SKY_FADE = [
  'rgba(28,24,20,0.42)',
  'rgba(28,24,20,0.16)',
  'rgba(247,242,234,0)',
  'rgba(247,242,234,0.86)',
  '#F7F2EA',
];
const SKY_STOPS = [0, 0.12, 0.68, 0.93, 1];

// A different order each day, the same order all day.
function shuffleToday<T>(list: T[]): T[] {
  let h = Math.floor(Date.now() / 86400000) + 2166136261;
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    const j = Math.abs(h) % (i + 1);
    const t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out;
}

// Admin picks win. Nothing picked means shuffle.
function curate<T extends { id: string }>(all: T[], picked: string[], fallbackCount: number): T[] {
  if (picked.length) {
    const byId = new Map(all.map((x) => [x.id, x]));
    const out = picked.map((id) => byId.get(id)).filter(Boolean) as T[];
    if (out.length) return out;
  }
  return shuffleToday(all).slice(0, fallbackCount);
}

const WD_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// The first open hour in the next fortnight, read from what the expert set.
// Availability only, so it can suggest an hour someone else has already taken.
// The copy says next available rather than promising it.
function nextOpenHour(av: any): Date | null {
  const now = Date.now();
  for (let d = 0; d < 14; d++) {
    const day = new Date();
    day.setDate(day.getDate() + d);
    const cfg = av ? av[WD_KEY[day.getDay()]] : null;
    let hours: number[] = [];
    if (cfg && Array.isArray(cfg.slots)) hours = cfg.slots;
    else if (cfg && cfg.on !== false) {
      const from = typeof cfg.start === 'number' ? cfg.start : 9;
      const to = typeof cfg.end === 'number' ? cfg.end : 17;
      for (let h = from; h < to; h++) hours.push(h);
    } else if (!av) {
      // No availability set at all. Weekdays, mid morning, as a stand-in.
      if (day.getDay() !== 0 && day.getDay() !== 6) hours = [10];
    }
    for (const h of hours) {
      const t = new Date(day);
      t.setHours(h, 0, 0, 0);
      if (t.getTime() > now + 3600000) return t;
    }
  }
  return null;
}

// Every keyword across all levels, since you can feel happy and still feel stressed.
const ALL_KEYWORDS = MOODS.flatMap((m) => m.keywords);

// A minimal lined face; the mouth goes from a frown (level 0) to a smile (level 4).
function Face({ level, active, color, dim }: { level: number; active: boolean; color: string; dim?: string }) {
  const c = active ? color : (dim ?? COLORS.muted);
  const sw = active ? 2.6 : 1.8;
  const cy = 25 + (level - 2) * 5; // 15, 20, 25(flat), 30, 35
  return (
    <Svg width={40} height={40} viewBox="0 0 40 40">
      <Circle cx={14} cy={16} r={2} fill={c} />
      <Circle cx={26} cy={16} r={2} fill={c} />
      <Path d={`M12 26 Q20 ${cy} 28 26`} stroke={c} strokeWidth={sw} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, profile, loading: authLoading } = useAuth();
  // Re-read auth when this tab regains focus. Tabs stay mounted in the
  // background, so a sign in or out on another tab does not repaint this screen
  // on its own here. This is the same focus refresh the You page uses.
  const [, setAuthTick] = useState(0);
  useFocusEffect(useCallback(() => { setAuthTick((t) => t + 1); }, []));
  // repaint on auth change: sign in or out while Home is already focused does
  // not fire a focus event, so react to the session value itself.
  useEffect(() => { setAuthTick((t) => t + 1); }, [session]);
  // On a cold launch the restored session can land after first paint. Hold the
  // signed-out prompt for a brief settle window so it does not flash or stick.
  const [authSettled, setAuthSettled] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAuthSettled(true), 1500); return () => clearTimeout(t); }, []);
  const loggedIn = !!session;
  const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : null;
  const todayMood = useTodayMood();
  const moodPicker = useMoodPicker();
  const [faceIdx, setFaceIdx] = useState<number | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [showChips, setShowChips] = useState(false);
  const chipsOpacity = useRef(new Animated.Value(1)).current;

  const fadeTimer = useRef<any>(null);

  useEffect(() => {
    if (todayMood) {
      const kws = todayMood.split(',').map((s) => s.trim()).filter(Boolean);
      setSelected(kws);
      if (kws[0]) {
        const i = MOODS.findIndex((m) => m.key === levelForKeyword(kws[0]));
        if (i >= 0) setFaceIdx(i);
      }
      setShowChips(false); // already saved today, so show only the faces
    }
  }, [todayMood]);
  useEffect(() => () => { if (fadeTimer.current) clearTimeout(fadeTimer.current); }, []);

  // After 10s of no interaction, fade the keywords away, leaving the faces.
  const scheduleFade = () => {
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => {
      Animated.timing(chipsOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setShowChips(false);
      });
    }, 5000);
  };
  const pressFace = (i: number) => {
    moodPicker.markAnswered();
    setFaceIdx(i);
    setShowChips(true);
    chipsOpacity.setValue(1);
    scheduleFade();
  };
  const toggleKw = (kw: string) => {
    setSelected((prev) => {
      const next = prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw];
      setMoodToday(next.join(','));
      return next;
    });
    chipsOpacity.setValue(1);
    scheduleFade();
  };

  const { map, lastReadId } = useProgress();
  const { articles } = useArticles();

  const snippet = snippetOfDay();
  const snippetBook = LIBRARY.find((l) => l.id === snippet.bookId);
  const quote = quoteOfDay();

  // The e-book rail moves on by itself, and a swipe takes over from there.
  const bookRef = useRef<ScrollView>(null);
  const [bookIdx, setBookIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setBookIdx((i) => {
        const next = (i + 1) % BOOKS.length;
        bookRef.current?.scrollTo({ x: next * CARD_W, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const upcoming = useUpcomingBookings()[0] ?? null;

  // Nothing booked, so offer something real instead of an empty card. A
  // different expert each day.
  const { experts: dbExperts } = useExperts();
  const pickedArticles = useFeaturedList(SLOT_HOME_ARTICLES);
  const pickedExperts = useFeaturedList(SLOT_HOME_EXPERTS);
  const homeArticles = useMemo(() => curate(articles, pickedArticles, 4), [articles, pickedArticles]);
  const homeExperts = useMemo(() => {
    const all = dbExperts && dbExperts.length ? dbExperts : EXPERTS;
    return curate(all as any[], pickedExperts, 3);
  }, [dbExperts, pickedExperts]);
  // Moves on by itself. Eight seconds, not four: this one is meant to be read
  // and tapped, and a card that changes under a finger is worse than a slow one.
  const [suggestTick, setSuggestTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSuggestTick((n) => n + 1), 8000);
    return () => clearInterval(t);
  }, []);

  const suggested = useMemo(() => {
    if (upcoming) return null;
    if (!HIGHLIGHTS.length) return null;
    const h = HIGHLIGHTS[suggestTick % HIGHLIGHTS.length];
    const live = dbExperts.find((e: any) => e.id === h.expertId);
    const fallback = EXPERTS.find((e) => e.id === h.expertId);
    const name = live?.name ?? fallback?.name ?? '';
    const when = nextOpenHour(live?.availability ?? fallback?.availability ?? null);
    return { h, name, when };
  }, [upcoming, dbExperts, suggestTick]);
  const reading = lastReadId ? articles.find((a) => a.id === lastReadId) : null;
  const pct = lastReadId ? Math.round((map[lastReadId] ?? 0) * 100) : 0;

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.skyBox, { paddingTop: insets.top + 34 }]}>
          <Image source={SKY} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient colors={SKY_FADE} locations={SKY_STOPS} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <Text style={styles.kicker}>THE INTEND</Text>
        <Text style={styles.greeting}>
          {greeting()}{firstName ? `, ${firstName}` : ''}.
        </Text>
        {authSettled && !loggedIn && !authLoading ? (
          <Pressable style={styles.signinPrompt} onPress={() => router.push('/login')}>
            <Text style={styles.signinPromptText}>Sign in or create an account to track your journey</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.94)" />
          </Pressable>
        ) : null}

        <View style={styles.moodCard}>
          <Text style={styles.moodQ}>How are you today?</Text>
          <View style={styles.facesRow}>
            {MOODS.map((m, i) => (
              <Pressable key={m.key} onPress={() => pressFace(i)} hitSlop={8} style={styles.faceBtn}>
                <Face level={i} active={faceIdx === i} color={m.color} dim="rgba(255,255,255,0.62)" />
              </Pressable>
            ))}
          </View>
          {showChips ? (
            <Animated.View style={[styles.chipsRow, { opacity: chipsOpacity }]}>
              {ALL_KEYWORDS.map((kw) => {
                const on = selected.includes(kw);
                const kwColor = MOODS.find((m) => m.key === levelForKeyword(kw))?.color;
                return (
                  <Pressable key={kw} onPress={() => toggleKw(kw)} hitSlop={4} style={styles.moodChip}>
                    <Text style={[styles.moodChipText, on && { color: kwColor }]}>{kw}</Text>
                  </Pressable>
                );
              })}
            </Animated.View>
          ) : null}
        </View>

        <Text style={[styles.label, styles.labelOn]}>UPCOMING SESSION</Text>
        {upcoming ? (
          <Pressable
            style={styles.sessionCard}
            onPress={() =>
              router.push(upcoming.kind === 'program' ? `/program/${upcoming.refId}` : `/class/${upcoming.refId}`)
            }
          >
            <View style={styles.sessionIcon}>
              <Ionicons name="videocam" size={18} color={COLORS.taupeBlue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionTitle}>{upcoming.title}</Text>
              <Text style={styles.sessionMeta}>{upcoming.when}</Text>
              <Text style={styles.sessionMeta}>with {upcoming.expert}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
          </Pressable>
        ) : suggested ? (
          <Pressable
            style={styles.sessionCard}
            onPress={() => router.push(`/book/${suggested.h.expertId}?service=${suggested.h.serviceId}`)}
          >
            <View style={styles.sessionIcon}>
              <Ionicons name="videocam" size={18} color={COLORS.taupeBlue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionTitle}>{suggested.h.title}</Text>
              <Text style={styles.sessionMeta}>
                {suggested.when ? `Upcoming ${formatWhenLocal({ starts_at: suggested.when.toISOString() })}` : 'Upcoming soon'}
              </Text>
              <Text style={styles.sessionMeta}>with {suggested.name}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
          </Pressable>
        ) : (
          <Pressable style={styles.emptyCard} onPress={() => router.navigate('/sessions')}>
            <Text style={styles.emptyText}>No sessions booked yet.</Text>
            <Text style={styles.emptyLink}>Browse what's coming up</Text>
          </Pressable>
        )}
        </View>

        {reading ? (
          <View>
            <Text style={styles.label}>CONTINUE READING</Text>
            <Pressable style={styles.readCard} onPress={() => router.push(`/article/${reading.id}`)}>
              <Text style={styles.readCat}>{reading.category.toUpperCase()}</Text>
              <Text style={styles.readTitle}>{reading.title}</Text>
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: `${Math.max(pct, 3)}%` }]} />
              </View>
              <Text style={styles.pctText}>{pct}% complete</Text>
            </Pressable>
          </View>
        ) : null}

        {articles.length > 0 ? (
          <View>
            <Text style={styles.section}>What readers are loving</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow} style={{ marginBottom: 28 }}>
              {homeArticles.map((a, i) => (
                <Pressable key={a.id} style={styles.featuredCard} onPress={() => router.push(`/article/${a.id}`)}>
                  <View style={styles.readCover}>
                    {a.image ? (
                      <Image source={{ uri: a.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    ) : (
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: ['#5C4632', '#6F7A6B', '#7E6A82', '#7C6F62'][i % 4] }]} />
                    )}
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(28,24,20,0.45)' }]} />
                    <View style={styles.readCoverInner}>
                      <Text style={styles.readCoverCat}>{a.category.toUpperCase()}</Text>
                      <Text style={styles.readCoverTitle} numberOfLines={3}>{a.title}</Text>
                    </View>
                  </View>
                  <Text style={styles.featuredKind}>{a.readMinutes} min read</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <Text style={styles.featureHead}>From the library</Text>
        <Text style={styles.featureSub}>A page from the newest e-book.</Text>
        <ScrollView
          ref={bookRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setBookIdx(Math.round(e.nativeEvent.contentOffset.x / CARD_W))}
          style={styles.bookRail}
        >
          {BOOKS.map((b) => (
            <Pressable key={b.id} style={styles.bookCard} onPress={() => router.push(`/ebook/${b.id}`)}>
              <Image source={b.cover} style={styles.bookImage} resizeMode="cover" />
              <View style={styles.trackRow}>
                {BOOKS.map((_, i) => (
                  <View key={i} style={[styles.trackSeg, i === bookIdx && styles.trackSegOn]} />
                ))}
              </View>
              <View style={styles.bookBody}>
                <View style={styles.bookMetaRow}>
                  <Text style={styles.bookTag}>{b.tag}</Text>
                  <Text style={styles.bookTime}>{b.time}</Text>
                </View>
                <Text style={styles.bookTitle}>{b.title}</Text>
                <Text style={styles.bookBlurb}>{b.blurb}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.section}>This week's expert highlight</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.expertRow}>
          {homeExperts.map((e: any) => (
            <Pressable key={e.id} style={styles.expertCard} onPress={() => router.push(`/expert/${e.id}`)}>
              {e.photo ? (
                <Image source={{ uri: e.photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.accent }]} />
              )}
              {/* Stacked bands stand in for a gradient, so there is no extra dependency. */}
              <View style={styles.expertShade} pointerEvents="none">
                {[0.06, 0.12, 0.22, 0.36, 0.52, 0.68].map((o, i) => (
                  <View key={i} style={[styles.expertShadeBand, { backgroundColor: `rgba(28,24,20,${o})` }]} />
                ))}
              </View>
              <View style={styles.expertOverlay}>
                <Text style={styles.expertCat}>{e.category.toUpperCase()}</Text>
                <Text style={styles.expertName} numberOfLines={2}>{e.name}</Text>
                <Text style={styles.expertTitle} numberOfLines={2}>{e.title}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          style={styles.snippetBand}
          onPress={() => router.push(snippetBook ? `/ebook/${snippetBook.id}` : '/read')}
        >
          <Text style={styles.snippetKicker}>FROM THE LIBRARY</Text>
          <Text style={styles.snippetText}>{snippet.passage}</Text>
          <View style={styles.snippetCtaRow}>
            <Text style={styles.snippetCta}>{snippet.cta}</Text>
            <Ionicons name="arrow-forward" size={15} color={COLORS.accent} />
          </View>
          {snippetBook ? <Text style={styles.snippetBook}>{snippetBook.title}</Text> : null}
        </Pressable>

        <Pressable style={styles.quoteCard} onPress={() => router.push('/affirmations')}>
          <Text style={styles.quoteKicker}>QUOTE OF THE DAY</Text>
          <Text style={styles.quoteMark}>{'\u201C'}</Text>
          <Text style={styles.quoteText}>{quote}</Text>
          <View style={styles.quoteRule} />
          <Text style={styles.quoteCta}>Start your affirmations</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 48 },
  // Breaks out of the content padding so the photo runs edge to edge, then
  // puts the padding back on the inside.
  skyBox: { marginHorizontal: -20, paddingHorizontal: 20, paddingBottom: 26, marginBottom: 6, overflow: 'hidden' },
  kicker: { fontSize: 12, letterSpacing: 3, color: 'rgba(255,255,255,0.72)', marginBottom: 10 },
  greeting: { fontFamily: FONT_SERIF, fontSize: 36, lineHeight: 43, color: '#FFFFFF', marginBottom: 26 },
  signinPrompt: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -14, marginBottom: 24 },
  signinPromptText: { fontSize: 14, color: 'rgba(255,255,255,0.94)' },
  moodCard: { backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.26)', padding: 18, marginBottom: 34 },
  moodQ: { fontSize: 12, letterSpacing: 1.5, color: 'rgba(255,255,255,0.82)', textTransform: 'uppercase', marginBottom: 14 },
  facesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  faceBtn: { padding: 6 },
  chipsRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14, marginTop: 16 },
  moodChip: { paddingVertical: 2 },
  moodChipText: { fontSize: 13, color: 'rgba(255,255,255,0.88)' },
  label: { fontSize: 12, letterSpacing: 1.5, color: COLORS.muted, marginBottom: 12 },
  labelOn: { color: 'rgba(255,255,255,0.86)' },
  sessionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', padding: 16, marginBottom: 28 },
  sessionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  sessionTitle: { fontFamily: FONT_SERIF, fontSize: 17, color: COLORS.ink },
  sessionMeta: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  emptyCard: { backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 18, marginBottom: 28 },
  emptyText: { fontSize: 14, color: COLORS.ink, opacity: 0.85 },
  emptyLink: { fontSize: 14, color: COLORS.accent, marginTop: 8 },
  readCard: { backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', padding: 18, marginBottom: 28 },
  readCat: { fontSize: 11, letterSpacing: 1.5, color: COLORS.accent, marginBottom: 8 },
  readTitle: { fontFamily: FONT_SERIF, fontSize: 18, lineHeight: 24, color: COLORS.ink, marginBottom: 14 },
  track: { height: 5, borderRadius: 3, backgroundColor: COLORS.line, overflow: 'hidden' },
  trackFill: { height: 5, backgroundColor: COLORS.accent },
  pctText: { fontSize: 12, color: COLORS.muted, marginTop: 8 },
  section: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginBottom: 14 },
  featureHead: { fontFamily: FONT_SERIF, fontSize: 24, lineHeight: 30, color: COLORS.ink, marginTop: 4 },
  featureSub: { fontSize: 14, color: COLORS.muted, marginTop: 6, marginBottom: 16 },
  bookRail: { marginBottom: 34 },
  bookCard: { width: CARD_W, backgroundColor: COLORS.cardMilk, borderRadius: 22, borderWidth: 1, borderColor: COLORS.line, overflow: 'hidden' },
  trackRow: { flexDirection: 'row', height: 2 },
  trackSeg: { flex: 1, backgroundColor: COLORS.line },
  trackSegOn: { backgroundColor: COLORS.ink },
  bookImage: { width: '100%', height: 168, backgroundColor: COLORS.accentSoft },
  bookBody: { padding: 18, backgroundColor: COLORS.cardMilk },
  bookMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  bookTag: { fontSize: 9, letterSpacing: 2, color: COLORS.accent },
  bookTime: { fontSize: 12, color: COLORS.muted },
  bookTitle: { fontFamily: FONT_SERIF, fontSize: 22, lineHeight: 28, color: COLORS.ink },
  bookBlurb: { fontSize: 14, lineHeight: 21, color: COLORS.ink, opacity: 0.78, marginTop: 8 },
  featuredRow: { gap: 14, paddingRight: 8 },
  readCover: { height: 150, borderRadius: 16, overflow: 'hidden', justifyContent: 'flex-end' },
  readCoverInner: { padding: 14 },
  readCoverCat: { fontSize: 9, letterSpacing: 1.5, color: 'rgba(255,255,255,0.9)', marginBottom: 4 },
  readCoverTitle: { fontFamily: FONT_SERIF, fontSize: 14, lineHeight: 18, color: '#FFFFFF' },
  featuredCard: { width: 220 },
  featuredCover: { height: 140, borderRadius: 18, padding: 16, justifyContent: 'flex-end' },
  featuredCoverTitle: { fontFamily: FONT_SERIF, fontSize: 21, lineHeight: 25, color: '#FFFFFF' },
  featuredName: { fontFamily: FONT_SERIF, fontSize: 15, color: COLORS.ink, marginTop: 10 },
  featuredKind: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  expertRow: { gap: 16, paddingRight: 8, paddingVertical: 8 },
  expertCard: { width: 232, height: 320, borderRadius: 26, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: COLORS.line, shadowColor: '#2B2622', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  expertShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 200 },
  expertShadeBand: { flex: 1 },
  expertOverlay: { padding: 18 },
  expertCat: { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.78)', marginBottom: 7 },
  expertName: { fontFamily: FONT_SERIF, fontSize: 22, lineHeight: 26, color: '#FFFFFF' },
  expertTitle: { fontSize: 12, lineHeight: 17, color: 'rgba(255,255,255,0.82)', marginTop: 4 },

  snippetBand: { backgroundColor: COLORS.wash, borderRadius: 22, padding: 22, marginTop: 30 },
  snippetKicker: { fontSize: 10, letterSpacing: 2, color: COLORS.muted, marginBottom: 14 },
  snippetText: { fontFamily: FONT_ITALIC, fontSize: 23, lineHeight: 32, color: COLORS.ink },
  snippetCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18 },
  snippetCta: { fontSize: 14, color: COLORS.accent },
  snippetBook: { fontSize: 11, letterSpacing: 0.6, color: COLORS.muted, marginTop: 10 },

  quoteCard: { backgroundColor: COLORS.card, borderRadius: 22, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 26, paddingHorizontal: 22, marginTop: 18, alignItems: 'center' },
  quoteKicker: { fontSize: 10, letterSpacing: 2, color: COLORS.muted },
  quoteMark: { fontFamily: FONT_SERIF, fontSize: 52, lineHeight: 52, color: COLORS.accent, opacity: 0.14, marginTop: 4 },
  quoteText: { fontFamily: FONT_SERIF, fontSize: 23, lineHeight: 33, color: COLORS.taupe, textAlign: 'center', marginTop: 2 },
  quoteRule: { width: 34, height: 1, backgroundColor: COLORS.line, marginTop: 20 },
  quoteCta: { fontSize: 13, color: COLORS.accent, marginTop: 16 },
});

