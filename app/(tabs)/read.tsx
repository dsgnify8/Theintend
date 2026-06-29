import { useMemo, useState } from 'react';
import { ActivityIndicator, ImageBackground, Modal, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { type Article } from '@/constants/articles';
import { useArticles } from '@/lib/articles';
import { LIBRARY, type LibraryItem } from '@/constants/library';
import { COLORS, FONT_SERIF } from '@/constants/brand';

const FORMATS = ['Articles', 'E-books', 'Books', 'Audiobooks'];
const TYPE_FOR: Record<string, string> = { 'E-books': 'E-book', 'Books': 'Book', 'Audiobooks': 'Audiobook' };

const CAT_COLOR: Record<string, string> = {
  Wellbeing: '#5C6B73',
  'Mental Health': '#5C6B73',
  Healing: '#6F7A6B',
  Wealth: '#7C6F62',
  Breathwork: '#5C4632',
};
const colorFor = (c: string) => CAT_COLOR[c] ?? '#7C6F62';

export default function LibraryScreen() {
  const router = useRouter();
  const [format, setFormat] = useState('Articles');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [cat, setCat] = useState<string | null>(null);
  const { loading, articles, error } = useArticles();
  const items = LIBRARY.filter((i) => i.type === TYPE_FOR[format]);

  const cats = useMemo(
    () => Array.from(new Set(articles.map((a) => a.category).filter(Boolean))),
    [articles]
  );
  const visible = cat ? articles.filter((a) => a.category === cat) : articles;

  const go = (path: string) => {
    setMenuOpen(false);
    router.push(path);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setShowBar(e.nativeEvent.contentOffset.y > 60);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
        <Text style={styles.kicker}>THE INTEND</Text>
        <View style={styles.titleRow}>
          <Text style={styles.h1}>Library</Text>
          <Pressable style={styles.menuBtn} onPress={() => setMenuOpen(true)} hitSlop={10}>
            <Ionicons name="menu" size={24} color={COLORS.ink} />
          </Pressable>
        </View>
        <Text style={styles.sub}>Read and listen at your own pace.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FORMATS.map((f) => {
            const on = f === format;
            return (
              <Pressable key={f} onPress={() => setFormat(f)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {format === 'Articles' ? (
          loading ? (
            <View style={styles.loader}>
              <ActivityIndicator color={COLORS.accent} />
              <Text style={styles.loaderText}>Loading your articles…</Text>
            </View>
          ) : (
            <View>
              {error ? (
                <Text style={styles.errNote}>Couldn't reach the blog ({error}). Showing a sample for now.</Text>
              ) : null}
              {visible.map((a) => (
                <ArticleCover key={a.id} article={a} />
              ))}
            </View>
          )
        ) : (
          <View>
            <Text style={styles.shelfTitle}>Top reads</Text>
            <View style={styles.grid}>
              {items.map((i) => (
                <TitleCard key={i.id} item={i} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {format === 'Articles' && showBar ? (
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

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} />
        <View style={styles.menuCard}>
          <MenuRow icon="musical-notes-outline" label="Sounds" onPress={() => go('/sounds')} />
          <MenuRow icon="document-text-outline" label="Workbooks" tag="Soon" onPress={() => go('/workbooks')} />
          <MenuRow icon="create-outline" label="Journaling" tag="Soon" onPress={() => go('/journaling')} />
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

function MenuRow({ icon, label, tag, onPress }: { icon: any; label: string; tag?: string; onPress: () => void }) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <Ionicons name={icon} size={18} color={COLORS.ink} />
      <Text style={styles.menuLabel}>{label}</Text>
      {tag ? <Text style={styles.menuTag}>{tag}</Text> : null}
    </Pressable>
  );
}

function ArticleCover({ article }: { article: Article }) {
  const router = useRouter();
  const img = article.image;
  return (
    <Pressable style={styles.cover} onPress={() => router.push(`/article/${article.id}`)}>
      {img ? (
        <ImageBackground source={{ uri: img }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colorFor(article.category) }]} />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.86)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.coverContent}>
        <Text style={styles.coverCat}>{article.category.toUpperCase()}</Text>
        <Text style={styles.coverTitle}>{article.title}</Text>
        <Text style={styles.coverMeta}>{article.readMinutes} min read</Text>
      </View>
    </Pressable>
  );
}

function TitleCard({ item }: { item: LibraryItem }) {
  const router = useRouter();
  return (
    <Pressable style={styles.cardWrap} onPress={() => router.push(`/title/${item.id}`)}>
      <View style={[styles.bookCover, { backgroundColor: item.color }]}>
        <Ionicons name={item.type === 'Audiobook' ? 'headset-outline' : 'book-outline'} size={22} color="rgba(255,255,255,0.9)" />
      </View>
      <Text style={styles.bookTitle}>{item.title}</Text>
      <Text style={styles.bookAuthor}>{item.author}</Text>
      <Text style={styles.bookLen}>{item.length}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 96 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { fontFamily: FONT_SERIF, fontSize: 34, lineHeight: 40, color: COLORS.ink },
  menuBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' },
  sub: { fontSize: 15, lineHeight: 22, color: COLORS.muted, marginTop: 8, marginBottom: 12 },
  chips: { gap: 8, paddingVertical: 4, paddingRight: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line },
  chipOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  chipText: { fontSize: 13, color: COLORS.ink },
  chipTextOn: { color: COLORS.bg },
  loader: { paddingVertical: 60, alignItems: 'center' },
  loaderText: { fontSize: 14, color: COLORS.muted, marginTop: 12 },
  errNote: { fontSize: 13, color: COLORS.muted, marginTop: 16, marginBottom: 4 },
  cover: { borderRadius: 20, minHeight: 270, justifyContent: 'flex-end', marginTop: 16, overflow: 'hidden' },
  coverContent: { padding: 20 },
  coverCat: { fontSize: 11, letterSpacing: 1.5, color: 'rgba(255,255,255,0.9)', marginBottom: 8 },
  coverTitle: { fontFamily: FONT_SERIF, fontSize: 20, lineHeight: 25, color: '#FFFFFF' },
  coverMeta: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 8 },
  shelfTitle: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginTop: 22, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardWrap: { width: '48%', marginBottom: 22 },
  bookCover: { height: 170, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bookTitle: { fontFamily: FONT_SERIF, fontSize: 16, lineHeight: 21, color: COLORS.ink, marginTop: 10 },
  bookAuthor: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  bookLen: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  barWrap: { position: 'absolute', left: 0, right: 0, bottom: 22, alignItems: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(43,38,34,0.12)', overflow: 'hidden', backgroundColor: 'rgba(247,242,234,0.55)' },
  barText: { fontSize: 14, color: COLORS.ink },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.35)' },
  sheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 36, maxHeight: '80%' },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 16 },
  sheetTitle: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginBottom: 12 },
  catRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderTopWidth: 1, borderTopColor: COLORS.line },
  catLabel: { fontSize: 16, color: COLORS.ink },
  catLabelActive: { color: COLORS.accent, fontFamily: FONT_SERIF },
  menuBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  menuCard: { position: 'absolute', top: 104, right: 20, backgroundColor: COLORS.bg, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 6, minWidth: 190, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16 },
  menuLabel: { fontSize: 15, color: COLORS.ink, marginLeft: 12, flex: 1 },
  menuTag: { fontSize: 11, color: COLORS.muted, backgroundColor: COLORS.accentSoft, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, overflow: 'hidden' },
});
