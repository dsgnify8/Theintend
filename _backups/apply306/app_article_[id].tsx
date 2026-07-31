import { useEffect } from 'react';
import { ActivityIndicator, ImageBackground, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { type Article, type Block } from '@/constants/articles';
import { useArticles } from '@/lib/articles';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { isLiked, isSaved, recordRead, setProgress, toggleLiked, toggleSaved, useLiked, useSaved } from '@/lib/store';

export default function ArticleReader() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  useSaved();
  useLiked();
  const { loading, articles } = useArticles();
  const article = articles.find((a) => a.id === id);
  const recommendations = articles.filter((a) => a.id !== id).slice(0, 8);

  useEffect(() => {
    if (article) setProgress(article.id, 0);
  }, [article?.id]);

  useEffect(() => {
    if (id) recordRead(id);
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Backdrop />
        <Back router={router} />
        <View style={styles.loaderBox}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!article) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Backdrop />
        <Back router={router} />
        <Text style={styles.missing}>Article not found.</Text>
      </SafeAreaView>
    );
  }

  const saved = isSaved(article.id);
  const liked = isLiked(article.id);
  const onShare = () => Share.share({ message: `${article.title} — on The Intend` });

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const scrollable = contentSize.height - layoutMeasurement.height;
    const pct = scrollable > 0 ? contentOffset.y / scrollable : 1;
    setProgress(article.id, pct);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Backdrop />
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBar}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
          <Text style={styles.backText}>Library</Text>
        </Pressable>
        <View style={styles.icons}>
          <Pressable onPress={() => toggleSaved(article.id)} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? COLORS.accent : COLORS.muted} />
          </Pressable>
          <Pressable onPress={() => toggleLiked(article.id)} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? COLORS.accent : COLORS.muted} />
          </Pressable>
          <Pressable onPress={onShare} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="share-outline" size={20} color={COLORS.muted} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={64}>
        <Text style={styles.cat}>{article.category.toUpperCase()}</Text>
        <Text style={styles.title}>{article.title}</Text>
        <Text style={styles.meta}>{article.readMinutes} min read</Text>

        {article.body.map((block, i) => (
          <BlockView key={i} block={block} />
        ))}

        {recommendations.length > 0 ? (
          <View style={styles.recoSection}>
            <Text style={styles.recoTitle}>We think you'll enjoy</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recoRow}>
              {recommendations.map((a) => (
                <RecoCard key={a.id} article={a} onPress={() => router.push(`/article/${a.id}`)} />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Backdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={['#FBF7EF', '#F1E8D7']} style={StyleSheet.absoluteFill} />
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />
    </View>
  );
}

function BlockView({ block }: { block: Block }) {
  if (block.type === 'h') {
    return <Text style={styles.h2}>{block.runs.map((r) => r.text).join('')}</Text>;
  }
  return (
    <Text style={styles.para}>
      {block.runs.map((r, j) => (
        <Text key={j} style={[r.bold && styles.bold, r.italic && styles.italic]}>
          {r.text}
        </Text>
      ))}
    </Text>
  );
}

function RecoCard({ article, onPress }: { article: Article; onPress: () => void }) {
  return (
    <Pressable style={styles.recoCard} onPress={onPress}>
      <View style={styles.recoThumb}>
        {article.image ? (
          <ImageBackground source={{ uri: article.image }} style={StyleSheet.absoluteFill} imageStyle={{ borderRadius: 12 }} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#7C6F62', borderRadius: 12 }]} />
        )}
      </View>
      <Text style={styles.recoCat}>{article.category.toUpperCase()}</Text>
      <Text style={styles.recoName} numberOfLines={2}>{article.title}</Text>
    </Pressable>
  );
}

function Back({ router }: { router: any }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBar}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Library</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FBF7EF' },
  blobTop: { position: 'absolute', top: -150, right: -90, width: 360, height: 360, borderRadius: 180, backgroundColor: COLORS.accentSoft, opacity: 0.45 },
  blobBottom: { position: 'absolute', bottom: -160, left: -110, width: 380, height: 380, borderRadius: 190, backgroundColor: '#EDE3D2', opacity: 0.4 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  backBar: { flexDirection: 'row', alignItems: 'center' },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  icons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { padding: 6 },
  loaderBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 22, paddingBottom: 56 },
  cat: { fontSize: 11, letterSpacing: 1.5, color: COLORS.accent, marginBottom: 10, marginTop: 6 },
  title: { fontFamily: FONT_SERIF, fontSize: 28, lineHeight: 34, color: COLORS.ink },
  meta: { fontSize: 13, color: COLORS.muted, marginTop: 10, marginBottom: 24 },
  h2: { fontFamily: FONT_SERIF, fontSize: 22, lineHeight: 29, color: COLORS.ink, marginTop: 10, marginBottom: 12 },
  para: { fontSize: 16, lineHeight: 27, color: COLORS.ink, opacity: 0.9, marginBottom: 18 },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  recoSection: { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: COLORS.line },
  recoTitle: { fontFamily: FONT_SERIF, fontSize: 18, color: COLORS.ink, marginBottom: 14 },
  recoRow: { gap: 14, paddingRight: 8 },
  recoCard: { width: 150 },
  recoThumb: { height: 92, borderRadius: 12, overflow: 'hidden' },
  recoCat: { fontSize: 10, letterSpacing: 1, color: COLORS.accent, marginTop: 8 },
  recoName: { fontFamily: FONT_SERIF, fontSize: 14, lineHeight: 19, color: COLORS.ink, marginTop: 3 },
  missing: { padding: 24, fontSize: 15, color: COLORS.muted },
});
