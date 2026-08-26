import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_ITALIC, FONT_SERIF } from '@/constants/brand';
import { useShelfEbooks, type ShelfItem } from '@/lib/ebooks';
import { useAppImages } from '@/lib/appImages';

export default function EbooksScreen() {
  const router = useRouter();
  const { items, loading } = useShelfEbooks();
  const { images } = useAppImages();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.back} onPress={() => router.back()} hitSlop={12}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Library</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>THE INTEND</Text>
        <Text style={styles.h1}>E-books</Text>
        <View style={styles.titleRule} />
        <Text style={styles.sub}>
          Read at your own pace. Every one is written for a specific way of thinking through something.
        </Text>

        {loading ? (
          <View style={styles.loader}><ActivityIndicator color={COLORS.accent} /></View>
        ) : items.length === 0 ? (
          <Text style={styles.empty}>Nothing here yet.</Text>
        ) : (
          items.map((it) => <BigCard key={it.id} item={it} uri={images[`library:${it.id}`]} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BigCard({ item, uri }: { item: ShelfItem; uri?: string }) {
  const router = useRouter();
  const src = uri ? { uri } : (item as any).coverUrl ? { uri: (item as any).coverUrl } : (item as any).cover ? (item as any).cover : null;

  const open = () => {
    const hasFile = (item as any).url || (item as any).pdf || (item as any).html;
    router.push(hasFile ? `/ebook/${item.id}` : `/title/${item.id}`);
  };

  return (
    <Pressable style={styles.card} onPress={open}>
      {src ? (
        <Image source={src} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, styles.coverBlank, { backgroundColor: item.color }]}>
          <Ionicons name="book-outline" size={40} color="rgba(255,255,255,0.9)" />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.tag}>{item.type.toUpperCase()}{' \u00B7 '}{item.length}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.author}>by {item.author}</Text>
        {item.description ? (
          <Text style={styles.desc} numberOfLines={3}>{item.description}</Text>
        ) : null}
        <View style={styles.readRow}>
          <Text style={styles.readText}>Open</Text>
          <Ionicons name="arrow-forward" size={14} color={COLORS.accent} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  back: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 64 },
  kicker: { fontSize: 11, letterSpacing: 3, color: COLORS.muted, marginTop: 8, marginBottom: 12, textAlign: 'center' },
  h1: { fontFamily: FONT_SERIF, fontSize: 42, color: COLORS.ink, textAlign: 'center' },
  titleRule: { alignSelf: 'center', width: 30, height: 1, backgroundColor: COLORS.accent, opacity: 0.5, marginTop: 14, marginBottom: 14 },
  sub: { fontSize: 14, lineHeight: 22, color: COLORS.muted, textAlign: 'center', paddingHorizontal: 16, marginBottom: 32 },
  loader: { paddingVertical: 60, alignItems: 'center' },
  empty: { paddingVertical: 40, fontSize: 14, color: COLORS.muted, textAlign: 'center' },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 22, borderWidth: 1, borderColor: COLORS.line,
    marginBottom: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3,
  },
  cover: { width: '100%', height: 260, backgroundColor: COLORS.accentSoft },
  coverBlank: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: 22 },
  tag: { fontSize: 10, letterSpacing: 2, color: COLORS.muted, marginBottom: 10 },
  title: { fontFamily: FONT_SERIF, fontSize: 24, lineHeight: 30, color: COLORS.ink },
  author: { fontFamily: FONT_ITALIC, fontSize: 15, color: COLORS.accent, marginTop: 8 },
  desc: { fontSize: 14, lineHeight: 22, color: COLORS.taupe, marginTop: 12 },
  readRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  readText: { fontSize: 13, color: COLORS.accent, letterSpacing: 0.2 },
});
