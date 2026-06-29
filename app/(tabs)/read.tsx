import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { ARTICLES, READ_FORMATS, type Article } from '@/constants/articles';
import { COLORS, FONT_SERIF } from '@/constants/brand';

export default function ReadScreen() {
  const [format, setFormat] = useState('Articles');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>THE INTEND</Text>
        <Text style={styles.h1}>Read</Text>
        <Text style={styles.sub}>Articles, e-books, workbooks and books to read at your own pace.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {READ_FORMATS.map((f) => {
            const on = f === format;
            return (
              <Pressable key={f} onPress={() => setFormat(f)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {format === 'Articles' ? (
          <View>
            <Text style={styles.section}>All articles</Text>
            {ARTICLES.map((a) => (
              <ArticleRow key={a.id} article={a} />
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{format} are coming soon</Text>
            <Text style={styles.emptyText}>We are curating this collection. Check back shortly.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ArticleRow({ article }: { article: Article }) {
  return (
    <Pressable style={styles.article} onPress={() => WebBrowser.openBrowserAsync(article.url)}>
      <Text style={styles.articleCat}>{article.category.toUpperCase()}</Text>
      <Text style={styles.articleTitle}>{article.title}</Text>
      <Text style={styles.articleExcerpt}>{article.excerpt}</Text>
      <Text style={styles.articleMeta}>{article.readMinutes} min read</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginBottom: 10 },
  h1: { fontFamily: FONT_SERIF, fontSize: 34, lineHeight: 40, color: COLORS.ink },
  sub: { fontSize: 15, lineHeight: 22, color: COLORS.muted, marginTop: 8, marginBottom: 18 },
  chips: { gap: 8, paddingVertical: 4, paddingRight: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line },
  chipOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  chipText: { fontSize: 13, color: COLORS.ink },
  chipTextOn: { color: COLORS.bg },
  section: { fontFamily: FONT_SERIF, fontSize: 22, color: COLORS.ink, marginTop: 24, marginBottom: 14 },
  article: { backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, padding: 20, marginBottom: 14 },
  articleCat: { fontSize: 11, letterSpacing: 1.5, color: COLORS.accent, marginBottom: 8 },
  articleTitle: { fontFamily: FONT_SERIF, fontSize: 19, lineHeight: 25, color: COLORS.ink, marginBottom: 8 },
  articleExcerpt: { fontSize: 14, lineHeight: 21, color: COLORS.ink, opacity: 0.8, marginBottom: 10 },
  articleMeta: { fontSize: 13, color: COLORS.muted },
  empty: { backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, padding: 24, marginTop: 8, alignItems: 'center' },
  emptyTitle: { fontFamily: FONT_SERIF, fontSize: 18, color: COLORS.ink, marginBottom: 8 },
  emptyText: { fontSize: 14, lineHeight: 21, color: COLORS.muted, textAlign: 'center' },
});
