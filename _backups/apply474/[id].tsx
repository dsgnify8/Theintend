import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from '@/components/Img';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { blocksToText, saveArticleOverride, textToBlocks, useArticle } from '@/lib/articles';

export default function AdminArticleEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role } = useAuth();
  const { article, loading } = useArticle(id);

  const [filled, setFilled] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState<false | 'save' | 'cover'>(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (article && !filled) {
      setTitle(article.title);
      setCategory(article.category);
      setBodyText(blocksToText(article.body));
      setImage(article.image ?? null);
      setFilled(true);
    }
  }, [article, filled]);

  if (role !== 'admin') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackBar onPress={() => router.back()} />
        <View style={styles.center}><Text style={styles.muted}>Admins only.</Text></View>
      </SafeAreaView>
    );
  }

  if (loading || !article) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackBar onPress={() => router.back()} />
        <View style={styles.center}><ActivityIndicator color={COLORS.accent} /></View>
      </SafeAreaView>
    );
  }

  const pickCover = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true, aspect: [16, 9], quality: 0.8, base64: true,
    });
    if (res.canceled || !res.assets?.[0]?.base64) return;
    setBusy('cover');
    setStatus(null);
    try {
      // A new name every time, so a replaced cover gets a new URL and nothing
      // serves the old one from any cache. Bucket is 'ebooks' since it is
      // already configured for public content uploads; the articles/ prefix
      // keeps things findable.
      const path = `articles/${article.id}-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('ebooks')
        .upload(path, decode(res.assets[0].base64), { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
      const url = supabase.storage.from('ebooks').getPublicUrl(path).data.publicUrl;
      setImage(url);
      setStatus('Cover uploaded. Save to publish it.');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Could not save that image.');
    }
    setBusy(false);
  };

  const removeCover = () => {
    setImage(null);
    setStatus('Cover removed. Save to publish it.');
  };

  const save = async () => {
    setBusy('save');
    setStatus(null);
    const { error } = await saveArticleOverride(article.id, {
      title, category, body: textToBlocks(bodyText),
      // image is passed even when null so removing a cover persists.
      image: image ?? undefined,
    });
    setStatus(error ? `Save failed: ${error.message}` : 'Saved. The article is updated for everyone.');
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackBar onPress={() => router.back()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.h1}>Edit article</Text>

          <Field label="Title" value={title} onChangeText={setTitle} />
          <Field label="Category" value={category} onChangeText={setCategory} />

          <Text style={styles.fieldLabel}>Cover image</Text>
          <Text style={styles.hint}>Shows on every card that links to this article. Landscape 16:9 reads best.</Text>
          {image ? (
            <View style={styles.coverWrap}>
              <Image source={{ uri: image }} style={styles.coverImg} resizeMode="cover" />
            </View>
          ) : (
            <View style={[styles.coverWrap, styles.coverPlaceholder]}>
              <Ionicons name="image-outline" size={28} color={COLORS.muted} />
              <Text style={styles.coverPlaceholderText}>No cover yet</Text>
            </View>
          )}
          <View style={styles.coverBtnRow}>
            <Pressable style={styles.coverBtn} onPress={pickCover} disabled={busy === 'cover'}>
              {busy === 'cover'
                ? <ActivityIndicator color={COLORS.ink} />
                : <>
                    <Ionicons name={image ? 'refresh-outline' : 'image-outline'} size={15} color={COLORS.ink} />
                    <Text style={styles.coverBtnText}>{image ? 'Replace cover' : 'Choose cover'}</Text>
                  </>}
            </Pressable>
            {image ? (
              <Pressable style={styles.coverRemoveBtn} onPress={removeCover} hitSlop={8}>
                <Text style={styles.coverRemoveText}>Remove</Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.fieldLabel}>Body</Text>
          <Text style={styles.hint}>Leave a blank line between paragraphs. Start a line with ## for a heading, and wrap text in **double stars** to make it bold.</Text>
          <TextInput
            value={bodyText}
            onChangeText={setBodyText}
            multiline
            style={[styles.input, styles.body]}
            placeholderTextColor={COLORS.muted}
          />

          <Pressable style={styles.saveBtn} onPress={save} disabled={busy === 'save'}>
            {busy === 'save' ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.saveText}>Save changes</Text>}
          </Pressable>
          {status ? <Text style={styles.status}>{status}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText }: { label: string; value: string; onChangeText: (t: string) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} style={styles.input} placeholderTextColor={COLORS.muted} />
    </View>
  );
}

function BackBar({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.backBar} onPress={onPress} hitSlop={10}>
      <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
      <Text style={styles.backText}>Articles</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 15, color: COLORS.muted },
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  h1: { fontFamily: FONT_SERIF, fontSize: 30, color: COLORS.ink, marginBottom: 16 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  hint: { fontSize: 12, lineHeight: 18, color: COLORS.muted, marginBottom: 8 },
  input: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: COLORS.ink },
  body: { minHeight: 280, textAlignVertical: 'top', lineHeight: 22 },
  saveBtn: { marginTop: 18, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.taupeBlue, alignItems: 'center' },
  saveText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  status: { fontSize: 14, lineHeight: 20, color: COLORS.ink, marginTop: 14, textAlign: 'center' },
  coverWrap: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, marginBottom: 10 },
  coverImg: { width: '100%', height: '100%' },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  coverPlaceholderText: { fontSize: 13, color: COLORS.muted },
  coverBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  coverBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.card, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 10, paddingHorizontal: 16 },
  coverBtnText: { fontSize: 13, color: COLORS.ink },
  coverRemoveBtn: { paddingVertical: 10, paddingHorizontal: 12 },
  coverRemoveText: { fontSize: 13, color: COLORS.muted },
});
