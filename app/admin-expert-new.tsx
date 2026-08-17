import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Image } from '@/components/Img';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { expertSlug, newExpert, uploadExpertImage, useExperts } from '@/lib/experts';

const WASH = ['rgba(107,97,87,0.13)', 'rgba(107,97,87,0.04)', 'rgba(107,97,87,0)'];

export default function AdminExpertNew() {
  const router = useRouter();
  const { role } = useAuth();
  const { experts } = useExperts();

  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [idTouched, setIdTouched] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [blurb, setBlurb] = useState('');
  const [bio, setBio] = useState('');
  const [keywords, setKeywords] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [q3, setQ3] = useState('');

  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // The id follows the name until someone types their own.
  useEffect(() => {
    if (!idTouched) setId(expertSlug(name));
  }, [name, idTouched]);

  // The categories already in use, so a new expert joins an existing filter on
  // the experts page rather than creating one of their own by a typo.
  const categories = Array.from(new Set(experts.map((e: any) => e.category).filter(Boolean)));

  if (role !== 'admin') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <Back onPress={() => router.back()} />
        <Text style={styles.muted}>Admins only.</Text>
      </SafeAreaView>
    );
  }

  const pickPhoto = async () => {
    if (!id) { setStatus('Put their name in first, so the photo has somewhere to go.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [3, 4], quality: 0.7, base64: true });
    if (res.canceled || !res.assets?.[0]?.base64) return;
    setUploading(true);
    setStatus(null);
    try {
      setPhoto(await uploadExpertImage(id, res.assets[0].base64));
    } catch (e: any) {
      setStatus(`Photo upload failed: ${e?.message ?? 'unknown error'}`);
    }
    setUploading(false);
  };

  const create = async () => {
    if (!name.trim()) { setStatus('They need a name.'); return; }
    if (!id.trim()) { setStatus('They need an id. The name usually fills it in.'); return; }
    if (!title.trim()) { setStatus('They need a title. It shows under their name.'); return; }
    if (!category.trim()) { setStatus('They need a category. It is the filter on the experts page.'); return; }

    setBusy(true);
    setStatus(null);
    const { error } = await newExpert({
      id: id.trim(),
      name: name.trim(),
      title: title.trim(),
      category: category.trim(),
      blurb: blurb.trim(),
      bio: bio.trim(),
      faqs: [q1, q2, q3].map((q) => q.trim()).filter(Boolean),
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      photo,
      account_email: accountEmail.trim() || null,
    });
    setBusy(false);

    if (error) { setStatus(error.message ?? 'Could not create them.'); return; }

    Alert.alert(
      `${name.trim()} is on the app`,
      'Add their sessions next, or they will have a profile with nothing to book.',
      [
        { text: 'Later', onPress: () => router.back() },
        { text: 'Add sessions', onPress: () => router.replace(`/admin-expert-services/${id.trim()}`) },
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
          <Text style={styles.h1}>New expert</Text>
          <Text style={styles.sub}>
            Everything here shows on their profile. Sessions come after, on their own screen.
          </Text>

          <View style={styles.photoRow}>
            <View style={styles.avatar}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatarImg} resizeMode="cover" />
              ) : (
                <Ionicons name="person-outline" size={26} color={COLORS.muted} />
              )}
              {uploading ? <View style={styles.avatarBusy}><ActivityIndicator color={COLORS.bg} /></View> : null}
            </View>
            <Pressable style={styles.photoBtn} onPress={pickPhoto}>
              <Ionicons name="camera-outline" size={15} color={COLORS.ink} />
              <Text style={styles.photoBtnText}>{photo ? 'Change photo' : 'Add a photo'}</Text>
            </Pressable>
          </View>

          <Text style={styles.group}>WHO THEY ARE</Text>
          <Field label="Name" value={name} onChangeText={setName} placeholder="Dr. Joanna Gudkina" />
          <Field
            label="Id"
            value={id}
            onChangeText={(t: string) => { setIdTouched(true); setId(expertSlug(t)); }}
            note="Follows the name. It is in their web address and cannot be changed later."
          />
          <Field label="Title" value={title} onChangeText={setTitle} placeholder="Kundalini Yoga and Somatic Specialist" note="The line under their name." />

          <Field label="Category" value={category} onChangeText={setCategory} placeholder="Body and Somatics" note="The filter on the experts page." />
          {categories.length > 0 ? (
            <View style={styles.chips}>
              {categories.map((c: any) => (
                <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipOn]}>
                  <Text style={[styles.chipText, category === c && styles.chipTextOn]}>{c}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Field label="Keywords" value={keywords} onChangeText={setKeywords} placeholder="Breathwork, Trauma Healing, Somatic" note="Separated by commas. Three or four is plenty." />

          <Text style={styles.group}>WHAT THEY DO</Text>
          <Field label="Short blurb" value={blurb} onChangeText={setBlurb} multiline note="A sentence or two. This is what people read on the experts page before they open a profile." />
          <Field label="Their approach" value={bio} onChangeText={setBio} multiline tall note="The long version, on their profile. Written about them rather than by them." />

          <Text style={styles.group}>CLIENT QUESTIONS</Text>
          <Text style={styles.groupNote}>
            Three things someone might arrive saying. Written in their words, not yours, so a
            person recognises themselves in one of them.
          </Text>
          <Field label="One" value={q1} onChangeText={setQ1} multiline />
          <Field label="Two" value={q2} onChangeText={setQ2} multiline />
          <Field label="Three" value={q3} onChangeText={setQ3} multiline />

          <Text style={styles.group}>THEIR ACCOUNT</Text>
          <Field
            label="Email"
            value={accountEmail}
            onChangeText={setAccountEmail}
            placeholder="them@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            note="Links this profile to their login, which gives them the expert panel. Can be added later."
          />

          {status ? <Text style={styles.status}>{status}</Text> : null}

          <Pressable style={[styles.saveBtn, busy && { opacity: 0.6 }]} disabled={busy} onPress={create}>
            {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.saveText}>Create expert</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, note, placeholder, multiline, tall, autoCapitalize, keyboardType }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.muted}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.inputMulti, tall && styles.inputTall]}
      />
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

function Back({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.backBar} onPress={onPress} hitSlop={10}>
      <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
      <Text style={styles.backText}>Experts</Text>
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
  sub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginBottom: 18 },
  muted: { fontSize: 15, color: COLORS.muted, padding: 24 },

  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 },
  avatar: { width: 66, height: 66, borderRadius: 33, backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarBusy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.45)', alignItems: 'center', justifyContent: 'center' },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: COLORS.line, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16 },
  photoBtnText: { fontSize: 14, color: COLORS.ink },

  group: { fontSize: 10, letterSpacing: 2.4, color: COLORS.muted, marginTop: 26, marginBottom: 12 },
  groupNote: { fontSize: 13, lineHeight: 20, color: COLORS.muted, marginTop: -6, marginBottom: 14 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  note: { fontSize: 12, lineHeight: 18, color: COLORS.muted, marginTop: 6 },
  input: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: COLORS.ink },
  inputMulti: { minHeight: 76, textAlignVertical: 'top' },
  inputTall: { minHeight: 150 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -8, marginBottom: 16 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line },
  chipOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  chipText: { fontSize: 12, color: COLORS.ink },
  chipTextOn: { color: COLORS.bg },

  status: { fontSize: 14, lineHeight: 20, color: COLORS.accent, marginTop: 6, marginBottom: 4 },
  saveBtn: { marginTop: 16, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.ink, alignItems: 'center' },
  saveText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.4 },
});
