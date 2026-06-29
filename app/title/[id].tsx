import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LIBRARY } from '@/constants/library';
import { COLORS, FONT_SERIF } from '@/constants/brand';

export default function TitleDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = LIBRARY.find((i) => i.id === id);
  const [started, setStarted] = useState(false);

  if (!item) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
          <Text style={styles.backText}>Library</Text>
        </Pressable>
        <Text style={styles.missing}>Title not found.</Text>
      </SafeAreaView>
    );
  }

  const isAudio = item.type === 'Audiobook';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Library</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.coverWrap}>
          <View style={[styles.cover, { backgroundColor: item.color }]}>
            <Ionicons name={isAudio ? 'headset-outline' : 'book-outline'} size={36} color="rgba(255,255,255,0.9)" />
          </View>
        </View>

        <Text style={styles.type}>{item.type.toUpperCase()} · {item.length}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.author}>{item.author}</Text>

        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.body}>{item.description}</Text>

        {started ? (
          <Text style={styles.note}>
            {isAudio ? 'Audio playback' : 'The in-app reader'} arrives with your real library content.
          </Text>
        ) : (
          <Pressable style={styles.primaryBtn} onPress={() => setStarted(true)}>
            <Text style={styles.primaryText}>{isAudio ? 'Listen' : 'Read sample'}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 48, alignItems: 'center' },
  coverWrap: { alignItems: 'center', marginTop: 8, marginBottom: 22 },
  cover: { width: 150, height: 200, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  type: { fontSize: 11, letterSpacing: 1.5, color: COLORS.muted },
  title: { fontFamily: FONT_SERIF, fontSize: 26, lineHeight: 31, color: COLORS.ink, textAlign: 'center', marginTop: 10 },
  author: { fontSize: 14, color: COLORS.muted, marginTop: 8 },
  sectionTitle: { fontFamily: FONT_SERIF, fontSize: 18, color: COLORS.ink, alignSelf: 'flex-start', marginTop: 28, marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 24, color: COLORS.ink, opacity: 0.88, alignSelf: 'flex-start' },
  primaryBtn: { marginTop: 28, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 999, backgroundColor: COLORS.accent },
  primaryText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  note: { fontSize: 13, lineHeight: 20, color: COLORS.muted, textAlign: 'center', marginTop: 24 },
  missing: { padding: 24, fontSize: 15, color: COLORS.muted },
});
