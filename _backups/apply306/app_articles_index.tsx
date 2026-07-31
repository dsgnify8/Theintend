import { useMemo, useState } from 'react';
import {
  ActivityIndicator, ImageBackground, Modal, NativeScrollEvent, NativeSyntheticEvent,
  Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Stack, useRouter } from 'expo-router';
import { type Article } from '@/constants/articles';
import { useArticles } from '@/lib/articles';
import { COLORS, FONT_SERIF } from '@/constants/brand';

const CAT_COLOR: Record<string, string> = {
  Wellbeing: '#5C6B73',
  'Mental Health': '#5C6B73',
  Healing: '#6F7A6B',
  Wealth: '#7C6F62',
  Breathwork: '#5C4632',
};
const colorFor = (c: string) => CAT_COLOR[c] ?? '#7C6F62';

const SCRIM = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.86)'] as const;

export default function ArticlesScreen() {
  const router = useRouter();
  const { loading, articles, error } = useArticles();
  const [showBar, setShowBar] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [cat, setCat] = useState<string | null>(null);

  const cats = useMemo(
    () => Array.from(new Set(articles.map((a) => a.category).filter(Boolean))),
    [articles]
  );

  // Newest first comes from the articles_cache ordering, so index 0 is the lead.
  const lead = cat ? null : articles[0];
  const focus = cat ? [] : articles.slice(1, 6);
  const rest = cat ? articles.filter((a) => a.category === cat) : articles.slice(6);

  const grouped = useMemo(() => {
    if (cat) return [];
    const map = new Map<string, Article[]>();
    for (const a of rest) {
      const k = a.category || 'Article';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    }
    return Array.from(map.entries());
  }, [rest, cat]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setShowBar(e.nativeEvent.contentOffset.y > 60);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        </Pressable>
        <Text style={styles.headTitle}>Articles</Text>
        <View style={styles.headBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loaderText}>Gathering the reading room</Text>
          </View>
        ) : (
          <View>
            {error ? <Text style={styles.errNote}>Could not reach the blog. Showing a sample for now.</Text> : null}

            {cat ? (
              <View style={styles.filterHead}>
                <Text style={styles.filterHeadTitle}>{cat}</Text>
                <Pressable onPress={() => setCat(null)} hitSlop={8}>
                  <Text style={styles.filterHeadClear}>Show all</Text>
                </Pressable>
              </View>
            ) : null}

            {lead ? (
              <Pressable style={styles.lead} onPress={() => router.push(`/article/${lead.id}`)}>
                {lead.image ? (
                  <ImageBackground source={{ uri: lead.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: colorFor(lead.category) }]} />
                )}
                <LinearGradient colors={SCRIM} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
                <View style={styles.leadBody}>
                  <Text style={styles.leadTag}>LATEST</Text>
                  <Text style={styles.leadTitle}>{lead.title}</Text>
                  <Text style={styles.leadMeta}>
                    {lead.category}{'\u2009\u00B7\u2009'}{lead.readMinutes} min read
                  </Text>
                </View>
              </Pressable>
            ) : null}

            {focus.length ? (
              <View>
                <Text style={styles.sectionTitle}>In focus</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
                  {focus.map((a) => <FocusCard key={a.id} article={a} />)}
                </ScrollView>
              </View>
            ) : null}

            {cat ? (
              rest.map((a) => <Cover key={a.id} article={a} />)
            ) : (
              grouped.map(([label, list]) => (
                <View key={label}>
                  <Text style={styles.sectionTitle}>{label}</Text>
                  {list.map((a) => <Cover key={a.id} article={a} />)}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {showBar ? (
        <View style={styles.barWrap} pointerEvents="box-none">
          <Pressable onPress={() => setFilterOpen(true)}>
            <BlurView intensity={32} tint="light" style={styles.bar}>
              <Ionicons name="options-outline" size={17} color={COLORS.ink} />
              <Text style={styles.barText}>{cat ?? 'All categories'}</Text>
              <Ionicons name="chevron-up" size={16} color={COLORS.muted} />
            </BlurView>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setFilterOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Filter by category</Text>
            <CatRow label="All categories" active={cat === null} onPress={() => { setCat(null); setFilterOpen(false); }} />
            {cats.map((c) => (
              <CatRow key={c} label={c} active={cat === c} onPress={() => { setCat(c); setFilterOpen(false); }} />
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function CatRow({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.catRow} onPress={onPress}>
      <Text style={[styles.catLabel, active && styles.catLabelActive]}>{label}</Text>
      {active ? <Ionicons name="checkmark" size={18} color={COLORS.accent} /> : null}
    </Pressable>
  );
}

function FocusCard({ article }: { article: Article }) {
  const router = useRouter();
  return (
    <Pressable style={styles.focus} onPress={() => router.push(`/article/${article.id}`)}>
      {article.image ? (
        <ImageBackground source={{ uri: article.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colorFor(article.category) }]} />
      )}
      <LinearGradient colors={SCRIM} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.focusBody}>
        <Text style={styles.focusCat}>{article.category.toUpperCase()}</Text>
        <Text style={styles.focusTitle} numberOfLines={3}>{article.title}</Text>
        <Text style={styles.focusMeta}>{article.readMinutes} min</Text>
      </View>
    </Pressable>
  );
}

function Cover({ article }: { article: Article }) {
  const router = useRouter();
  return (
    <Pressable style={styles.cover} onPress={() => router.push(`/article/${article.id}`)}>
      {article.image ? (
        <ImageBackground source={{ uri: article.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colorFor(article.category) }]} />
      )}
      <LinearGradient colors={SCRIM} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.coverContent}>
        <Text style={styles.coverCat}>{article.category.toUpperCase()}</Text>
        <Text style={styles.coverTitle}>{article.title}</Text>
        <Text style={styles.coverMeta}>{article.readMinutes} min read</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 10 },
  headBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headTitle: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink },
  content: { paddingHorizontal: 20, paddingBottom: 96 },

  loader: { paddingVertical: 80, alignItems: 'center' },
  loaderText: { fontSize: 14, color: COLORS.muted, marginTop: 12 },
  errNote: { fontSize: 13, color: COLORS.muted, marginBottom: 10 },

  filterHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 },
  filterHeadTitle: { fontFamily: FONT_SERIF, fontSize: 28, color: COLORS.ink },
  filterHeadClear: { fontSize: 13, color: COLORS.accent },

  lead: { height: 420, borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-end', marginTop: 6 },
  leadBody: { padding: 22 },
  leadTag: { fontSize: 10, letterSpacing: 2.4, color: 'rgba(255,255,255,0.9)', marginBottom: 10 },
  leadTitle: { fontFamily: FONT_SERIF, fontSize: 30, lineHeight: 37, color: '#FFFFFF' },
  leadMeta: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 10 },

  sectionTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginTop: 36, marginBottom: 4 },
  strip: { gap: 14, paddingTop: 14, paddingRight: 20 },
  focus: { width: 210, height: 280, borderRadius: 18, overflow: 'hidden', justifyContent: 'flex-end' },
  focusBody: { padding: 16 },
  focusCat: { fontSize: 9, letterSpacing: 1.6, color: 'rgba(255,255,255,0.9)', marginBottom: 6 },
  focusTitle: { fontFamily: FONT_SERIF, fontSize: 17, lineHeight: 22, color: '#FFFFFF' },
  focusMeta: { fontSize: 11, color: 'rgba(255,255,255,0.82)', marginTop: 6 },

  cover: { borderRadius: 20, minHeight: 270, justifyContent: 'flex-end', marginTop: 16, overflow: 'hidden' },
  coverContent: { padding: 20 },
  coverCat: { fontSize: 11, letterSpacing: 1.5, color: 'rgba(255,255,255,0.9)', marginBottom: 8 },
  coverTitle: { fontFamily: FONT_SERIF, fontSize: 20, lineHeight: 25, color: '#FFFFFF' },
  coverMeta: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 8 },

  barWrap: { position: 'absolute', left: 0, right: 0, bottom: 22, alignItems: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(43,38,34,0.12)', overflow: 'hidden', backgroundColor: 'rgba(247,242,234,0.55)' },
  barText: { fontSize: 14, color: COLORS.ink },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.35)' },
  sheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 36, maxHeight: '80%' },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 16 },
  sheetTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginBottom: 12 },
  catRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderTopWidth: 1, borderTopColor: COLORS.line },
  catLabel: { fontFamily: FONT_SERIF, fontSize: 16, color: COLORS.ink },
  catLabelActive: { color: COLORS.accent, fontWeight: '700' },
});
