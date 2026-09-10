import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { Image } from '@/components/Img';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { deleteEbook, loadEbookForEdit, loadEbooksRaw, saveEbook, slugify, type Ebook } from '@/lib/ebooks';

const WASH = ['rgba(107,97,87,0.13)', 'rgba(107,97,87,0.04)', 'rgba(107,97,87,0)'];

// RTL style for Arabic input values. Admin panel is English throughout;
// only the value the admin types when the Arabic tab is active gets Arabic
// formatting.
const AR_INPUT = { textAlign: 'right' as const, writingDirection: 'rtl' as const, letterSpacing: 0 };

type Lang = 'en' | 'ar';

const BLANK = {
  id: '', title: '', author: 'The Intend', description: '',
  length: 'Guided e-book', color: '#8A7C63', file_url: '', cover_url: '',
  published: false, sort: 100, tag: '', read_time: '', on_home: false,
  // Arabic content, held alongside English so a save writes both languages.
  arTitle: '', arAuthor: '', arDescription: '', arLength: '', arTag: '', arReadTime: '', i18nRaw: {},
};

// A new name every time, so a replaced file gets a new address and nothing
// serves the old one from a cache.
function pathFor(id: string, suffix: string) {
  return `${id || 'book'}-${Date.now()}${suffix}`;
}

async function putFile(path: string, body: any, contentType: string): Promise<string> {
  const { error } = await supabase.storage.from('ebooks').upload(path, body, { contentType, upsert: true });
  if (error) throw error;
  return supabase.storage.from('ebooks').getPublicUrl(path).data.publicUrl;
}

export default function AdminEbooks() {
  const router = useRouter();
  const { role } = useAuth();
  // Admin list is always English regardless of app locale, so a direct raw
  // fetch feeds local state. reloadList() re-fetches after save or delete.
  const [items, setItems] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);
  const reloadList = async () => {
    setLoading(true);
    setItems(await loadEbooksRaw());
    setLoading(false);
  };
  const reload = reloadList;

  const [lang, setLang] = useState<Lang>('en');
  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => { reloadList(); }, []);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  // The id follows the title until someone types their own, since an id that
  // has already been read from cannot be changed without losing the position.
  useEffect(() => {
    if (!form || form._idTouched || !form._isNew) return;
    const next = slugify(form.title || '');
    if (next !== form.id) setForm((f: any) => ({ ...f, id: next }));
  }, [form?.title]);

  if (role !== 'admin') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Back onPress={() => router.back()} />
        <Text style={styles.muted}>Admins only.</Text>
      </SafeAreaView>
    );
  }

  const pickHtml = async () => {
    if (!form?.id) { setStatus('Give it a title first, so the file has a name.'); return; }
    // Loaded on the press rather than at the top of the file. It is a native
    // module, and importing one that is not in the running build throws before
    // the screen can be defined at all.
    let DocumentPicker: any;
    try {
      DocumentPicker = require('expo-document-picker');
    } catch {
      setStatus('Choosing a file needs the next build. Paste a link below for now.');
      return;
    }

    const res = await DocumentPicker.getDocumentAsync({ type: ['text/html', 'public.html'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]?.uri) return;
    setBusy('html');
    setStatus(null);
    try {
      // Html is text, so it can be read and sent as a string. No file system
      // module needed for this one.
      const text = await (await fetch(res.assets[0].uri)).text();
      if (!text.trim()) throw new Error('That file came back empty.');
      const url = await putFile(pathFor(form.id, '.html'), text, 'text/html');
      set('file_url', url);
      setStatus(`${res.assets[0].name} uploaded.`);
    } catch (e: any) {
      setStatus(`Upload failed: ${e?.message ?? 'unknown error'}`);
    }
    setBusy(null);
  };

  const pickCover = async () => {
    if (!form?.id) { setStatus('Give it a title first, so the file has a name.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [3, 4], quality: 0.75, base64: true });
    if (res.canceled || !res.assets?.[0]?.base64) return;
    setBusy('cover');
    setStatus(null);
    try {
      const url = await putFile(pathFor(form.id, '.jpg'), decode(res.assets[0].base64), 'image/jpeg');
      set('cover_url', url);
      setStatus('Cover uploaded.');
    } catch (e: any) {
      setStatus(`Upload failed: ${e?.message ?? 'unknown error'}`);
    }
    setBusy(null);
  };

  const save = async () => {
    if (!form?.id?.trim()) { setStatus('It needs an id. The title usually fills it in.'); return; }
    if (!form?.title?.trim()) { setStatus('It needs a title.'); return; }
    if (!form?.file_url?.trim()) { setStatus('It needs a file. Choose one or paste a link.'); return; }

    setBusy('save');
    setStatus(null);
    // Peel off the internal-only fields plus the Arabic mirrors, then pack
    // Arabic into i18n merged with any existing i18n keys so unrelated
    // languages (fr, fa) are preserved.
    const {
      _isNew, _idTouched,
      arTitle, arAuthor, arDescription, arLength, arTag, arReadTime, i18nRaw,
      ...row
    } = form;
    const nextI18n = {
      ...(i18nRaw ?? {}),
      ar: {
        ...((i18nRaw ?? {}).ar ?? {}),
        title: (arTitle ?? '').trim(),
        author: (arAuthor ?? '').trim(),
        description: (arDescription ?? '').trim(),
        length: (arLength ?? '').trim(),
        tag: (arTag ?? '').trim(),
        read_time: (arReadTime ?? '').trim(),
      },
    };
    const { error } = await saveEbook({
      ...row,
      id: String(row.id).trim(),
      sort: Number(row.sort) || 100,
      cover_url: row.cover_url?.trim() || null,
      tag: row.tag?.trim() || null,
      read_time: row.read_time?.trim() || null,
      i18n: nextI18n,
    } as any);
    setBusy(null);
    if (error) { setStatus(`Could not save: ${error.message}`); return; }
    setForm(null);
    reload();
  };

  const remove = (b: Ebook) => {
    Alert.alert(
      `Remove ${b.title}`,
      'It comes off every shelf. The file stays in storage, so this can be undone by adding it again.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteEbook(b.id);
            if (error) { Alert.alert('That did not work', error.message); return; }
            setForm(null);
            reload();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={WASH} style={styles.wash} pointerEvents="none" />
      <Back onPress={() => router.back()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.h1}>E-books</Text>
          <Text style={styles.sub}>
            Anything added here appears on the library shelf and the homepage. Reading position
            is kept automatically.
          </Text>

          {form ? (
            <View style={styles.card}>
              <Text style={styles.formHead}>{form._isNew ? 'New e-book' : form.title}</Text>

              {/* Language tab. Controls the value of all per-language text
                  fields below. Field labels stay English per admin rules;
                  only the input value swaps and gets RTL formatting. */}
              <View style={styles.tabBar}>
                <Pressable onPress={() => setLang('en')} style={[styles.tab, lang === 'en' && styles.tabOn]}>
                  <Text style={[styles.tabText, lang === 'en' && styles.tabTextOn]}>English</Text>
                </Pressable>
                <Pressable onPress={() => setLang('ar')} style={[styles.tab, lang === 'ar' && styles.tabOn]}>
                  <Text style={[styles.tabText, lang === 'ar' && styles.tabTextOn]}>Arabic</Text>
                </Pressable>
              </View>

              {lang === 'ar' ? (
                <>
                  <Field label="Title" value={form.arTitle ?? ''} onChangeText={(t: string) => set('arTitle', t)} rtl />
                  <Field
                    label="Id"
                    value={form.id}
                    onChangeText={(t: string) => { set('_idTouched', true); set('id', slugify(t)); }}
                    note={form._isNew ? 'Follows the English title. Change it only if you mean to.' : 'Cannot change once people have read it.'}
                    editable={form._isNew}
                  />
                  <Field label="Author" value={form.arAuthor ?? ''} onChangeText={(t: string) => set('arAuthor', t)} rtl />
                  <Field label="Description" value={form.arDescription ?? ''} onChangeText={(t: string) => set('arDescription', t)} multiline rtl />
                  <Field label="Under the title" value={form.arLength ?? ''} onChangeText={(t: string) => set('arLength', t)} note="Guided e-book, 21-day journey, and so on." rtl />
                </>
              ) : (
                <>
                  <Field label="Title" value={form.title} onChangeText={(t: string) => set('title', t)} />
                  <Field
                    label="Id"
                    value={form.id}
                    onChangeText={(t: string) => { set('_idTouched', true); set('id', slugify(t)); }}
                    note={form._isNew ? 'Follows the title. Change it only if you mean to.' : 'Cannot change once people have read it.'}
                    editable={form._isNew}
                  />
                  <Field label="Author" value={form.author} onChangeText={(t: string) => set('author', t)} />
                  <Field label="Description" value={form.description} onChangeText={(t: string) => set('description', t)} multiline />
                  <Field label="Under the title" value={form.length} onChangeText={(t: string) => set('length', t)} note="Guided e-book, 21-day journey, and so on." />
                </>
              )}

              <Text style={styles.label}>The book</Text>
              <View style={styles.pickRow}>
                <Pressable style={styles.pickBtn} onPress={pickHtml} disabled={busy === 'html'}>
                  {busy === 'html'
                    ? <ActivityIndicator color={COLORS.ink} />
                    : <><Ionicons name="document-outline" size={15} color={COLORS.ink} /><Text style={styles.pickText}>Choose file</Text></>}
                </Pressable>
                {form.file_url ? <Ionicons name="checkmark-circle" size={19} color={COLORS.taupeBlue} /> : null}
              </View>
              <TextInput
                value={form.file_url}
                onChangeText={(t) => set('file_url', t)}
                placeholder="or paste a link to the html"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />

              <Text style={styles.label}>Cover</Text>
              <View style={styles.pickRow}>
                <Pressable style={styles.pickBtn} onPress={pickCover} disabled={busy === 'cover'}>
                  {busy === 'cover'
                    ? <ActivityIndicator color={COLORS.ink} />
                    : <><Ionicons name="image-outline" size={15} color={COLORS.ink} /><Text style={styles.pickText}>Choose image</Text></>}
                </Pressable>
                {form.cover_url ? (
                  <Image source={{ uri: form.cover_url }} style={styles.coverPeek} resizeMode="cover" />
                ) : null}
              </View>
              <TextInput
                value={form.cover_url}
                onChangeText={(t) => set('cover_url', t)}
                placeholder="or paste a link to the cover"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />

              {lang === 'ar' ? (
                <>
                  <Field label="Tag" value={form.arTag ?? ''} onChangeText={(t: string) => set('arTag', t)} note="Small caps above the title on the homepage." rtl />
                  <Field label="Reading time" value={form.arReadTime ?? ''} onChangeText={(t: string) => set('arReadTime', t)} note="25 min read, and so on." rtl />
                </>
              ) : (
                <>
                  <Field label="Tag" value={form.tag} onChangeText={(t: string) => set('tag', t)} note="Small caps above the title on the homepage. Gut health, longevity." />
                  <Field label="Reading time" value={form.read_time} onChangeText={(t: string) => set('read_time', t)} note="25 min read, and so on." />
                </>
              )}

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>On the homepage</Text>
                  <Text style={styles.note}>The three cards at the top. Off by default.</Text>
                </View>
                <Switch
                  value={!!form.on_home}
                  onValueChange={(v) => set('on_home', v)}
                  trackColor={{ true: COLORS.ink, false: COLORS.line }}
                />
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>On the shelf</Text>
                  <Text style={styles.note}>Off keeps it hidden while you finish it.</Text>
                </View>
                <Switch
                  value={!!form.published}
                  onValueChange={(v) => set('published', v)}
                  trackColor={{ true: COLORS.ink, false: COLORS.line }}
                />
              </View>

              <Field label="Order" value={String(form.sort)} onChangeText={(t: string) => set('sort', t.replace(/[^0-9]/g, ''))} note="Lower comes first." keyboardType="number-pad" />

              {status ? <Text style={styles.status}>{status}</Text> : null}

              <Pressable style={[styles.saveBtn, busy === 'save' && { opacity: 0.6 }]} disabled={busy === 'save'} onPress={save}>
                {busy === 'save' ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.saveText}>Save</Text>}
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => { setForm(null); setStatus(null); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.addBtn} onPress={() => { setForm({ ...BLANK, _isNew: true }); setStatus(null); }}>
              <Ionicons name="add" size={18} color={COLORS.bg} />
              <Text style={styles.addText}>Add an e-book</Text>
            </Pressable>
          )}

          {loading ? (
            <ActivityIndicator color={COLORS.accent} style={{ marginTop: 24 }} />
          ) : items.length === 0 ? (
            <Text style={styles.emptyText}>Nothing added yet. The four in the app are still there.</Text>
          ) : (
            items.map((b) => (
              <View key={b.id} style={styles.row2}>
                {b.cover_url ? (
                  <Image source={{ uri: b.cover_url }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumb, { backgroundColor: b.color, alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="book-outline" size={18} color="rgba(255,255,255,0.9)" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{b.title}</Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>{b.author}</Text>
                  {!b.published ? <Text style={styles.hidden}>Not on the shelf</Text> : null}
                </View>
                <Pressable onPress={async () => {
                  setStatus(null);
                  setLang('en');
                  // Fetch the raw row so both languages come in fresh. Fixes
                  // the pre-Stage-3 bug where editing while the app was in
                  // Arabic locale wrote Arabic back into English columns.
                  const raw = await loadEbookForEdit(b.id);
                  if (!raw) { setStatus('Could not load that one.'); return; }
                  setForm({
                    ...raw.en,
                    cover_url: raw.en.cover_url ?? '',
                    tag: raw.en.tag ?? '',
                    read_time: raw.en.read_time ?? '',
                    arTitle: raw.ar.title,
                    arAuthor: raw.ar.author,
                    arDescription: raw.ar.description,
                    arLength: raw.ar.length,
                    arTag: raw.ar.tag,
                    arReadTime: raw.ar.read_time,
                    i18nRaw: raw.i18nRaw,
                    _isNew: false,
                  });
                }} hitSlop={10}>
                  <Ionicons name="create-outline" size={19} color={COLORS.muted} />
                </Pressable>
                <Pressable onPress={() => remove(b)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={18} color="#8F4A3B" />
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, note, multiline, editable = true, keyboardType, rtl }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={label === 'Id' ? 'none' : 'sentences'}
        style={[styles.input, multiline && styles.inputTall, !editable && styles.inputOff, rtl && AR_INPUT]}
      />
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

function Back({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.backBar} onPress={onPress} hitSlop={10}>
      <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
      <Text style={styles.backText}>Admin</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  h1: { fontFamily: FONT_SERIF, fontSize: 30, color: COLORS.ink, marginBottom: 4 },
  sub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginBottom: 16 },
  muted: { fontSize: 15, color: COLORS.muted, padding: 24 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: COLORS.ink, borderRadius: 999, paddingVertical: 14, marginBottom: 18 },
  addText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.3 },

  card: { backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginBottom: 18 },
  formHead: { fontFamily: FONT_SERIF, fontSize: 20, color: COLORS.ink, marginBottom: 14 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  note: { fontSize: 12, color: COLORS.muted, marginTop: 5 },
  input: { backgroundColor: COLORS.bg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: COLORS.ink },
  inputTall: { minHeight: 80, textAlignVertical: 'top' },
  inputOff: { opacity: 0.55 },

  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: COLORS.line, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16 },
  pickText: { fontSize: 14, color: COLORS.ink },
  coverPeek: { width: 34, height: 45, borderRadius: 6 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 14 },
  status: { fontSize: 13, lineHeight: 19, color: COLORS.accent, marginTop: 12 },
  saveBtn: { marginTop: 14, paddingVertical: 15, borderRadius: 999, backgroundColor: COLORS.ink, alignItems: 'center' },
  saveText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.4 },
  cancelBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 14, color: COLORS.muted },

  row2: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 12, marginBottom: 8 },
  thumb: { width: 38, height: 50, borderRadius: 6 },
  rowTitle: { fontFamily: FONT_SERIF, fontSize: 15, color: COLORS.ink },
  rowMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  hidden: { fontSize: 11, color: COLORS.accent, marginTop: 3 },
  emptyText: { fontSize: 14, color: COLORS.muted, paddingVertical: 24, textAlign: 'center' },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.bg, borderRadius: 999, padding: 4, borderWidth: 1, borderColor: COLORS.line, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: 'center' },
  tabOn: { backgroundColor: COLORS.ink },
  tabText: { fontSize: 13, color: COLORS.ink },
  tabTextOn: { color: COLORS.bg },
});
