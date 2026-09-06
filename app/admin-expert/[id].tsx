// Admin expert editor.
//
// Language handling for admin: the admin panel UI is always in English:
// tab labels, field labels, buttons, hints. Only the value that the admin
// types into an input can be Arabic, and only when the Arabic tab is
// active. The four language-specific text fields (Name, Title, Short blurb,
// Bio) sit under an English | Arabic tab. Everything else (photo, framing,
// sessions/programs links, social links, linked account email) is not
// language-specific and stays outside the tab.
//
// On save the English fields go to the ordinary columns and the Arabic
// versions pack into the i18n jsonb column under the ar key. Any existing
// keys under other languages (fr, fa) are preserved via i18nRaw.

import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from '@/components/Img';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { loadExpertForEdit, updateExpert, uploadExpertImage } from '@/lib/experts';

type Lang = 'en' | 'ar';

// RTL style for Arabic input values. Deliberately inline rather than pulling
// from lib/i18n (AR_TEXT there is scoped to app-locale-driven rendering,
// which does not apply here since admin locale is always English).
const AR_INPUT = { textAlign: 'right' as const, writingDirection: 'rtl' as const, letterSpacing: 0 };

export default function AdminExpertEdit() {
  const router = useRouter();
  const { id: paramId } = useLocalSearchParams<{ id: string }>();
  const id = typeof paramId === 'string' ? paramId : '';
  const { role, user } = useAuth();

  const [lang, setLang] = useState<Lang>('en');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // English fields
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [blurb, setBlurb] = useState('');
  const [bio, setBio] = useState('');

  // Arabic fields
  const [arName, setArName] = useState('');
  const [arTitle, setArTitle] = useState('');
  const [arBlurb, setArBlurb] = useState('');
  const [arBio, setArBio] = useState('');

  // Preserved so a save does not wipe unrelated language keys.
  const [i18nRaw, setI18nRaw] = useState<any>({});

  // Non-language fields
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [twitter, setTwitter] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    loadExpertForEdit(id)
      .then((data) => {
        if (cancelled) return;
        if (!data) { setLoadError('Not found.'); setLoading(false); return; }
        setName(data.en.name);
        setTitle(data.en.title);
        setBlurb(data.en.blurb);
        setBio(data.en.bio);
        setInstagram(data.en.instagram);
        setTiktok(data.en.tiktok);
        setTwitter(data.en.twitter);
        setAccountEmail(data.en.accountEmail);
        setPhoto(data.en.photo);
        setArName(data.ar.name);
        setArTitle(data.ar.title);
        setArBlurb(data.ar.blurb);
        setArBio(data.ar.bio);
        setI18nRaw(data.i18nRaw);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e?.message ?? String(e));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (role !== 'admin') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackBar onPress={() => router.back()} />
        <View style={styles.center}><Text style={styles.muted}>Admins only.</Text></View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackBar onPress={() => router.back()} />
        <View style={styles.center}><ActivityIndicator color={COLORS.accent} /></View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackBar onPress={() => router.back()} />
        <View style={styles.center}><Text style={styles.muted}>Could not load: {loadError}</Text></View>
      </SafeAreaView>
    );
  }

  const initials = name.replace('Dr. ', '').split(' ').map((p) => p[0]).slice(0, 2).join('');

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true });
    if (res.canceled || !res.assets?.[0]?.base64) return;
    setUploading(true);
    setStatus(null);
    try {
      const url = await uploadExpertImage(id, res.assets[0].base64);
      setPhoto(url);
      // Written straight away rather than waiting for Save changes. Holding it
      // in state meant a photo could look uploaded, then be gone on leaving
      // the screen, which is what happened before. Socials go with it because
      // the same rationale applies to those.
      const { error } = await updateExpert(id, {
        photo: url,
        instagram: instagram.trim(), tiktok: tiktok.trim(), twitter: twitter.trim(),
      });
      setStatus(error ? `Photo uploaded but not saved: ${error.message}` : 'Photo saved. It is live everywhere now.');
    } catch (e: any) {
      setStatus(`Photo upload failed: ${e?.message ?? 'unknown error'}`);
    }
    setUploading(false);
  };

  const save = async () => {
    setBusy(true);
    setStatus(null);
    // Merge with i18nRaw so unrelated language keys (fr, fa) are not wiped.
    const nextI18n = {
      ...i18nRaw,
      ar: {
        // Preserve any other ar sub-keys that this editor does not know about.
        ...(i18nRaw?.ar ?? {}),
        name: arName,
        title: arTitle,
        blurb: arBlurb,
        bio: arBio,
      },
    };
    const { error } = await updateExpert(id, {
      name, title, blurb, bio,
      photo: photo ?? undefined,
      account_email: accountEmail.trim().toLowerCase(),
      i18n: nextI18n,
    });
    setStatus(error ? `Save failed: ${error.message}` : 'Saved. Changes are live across the app.');
    setBusy(false);
  };

  const isAr = lang === 'ar';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackBar onPress={() => router.back()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.head}>
            <View style={styles.avatar}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatarImg} resizeMode="cover" />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
              {uploading ? <View style={styles.overlay}><ActivityIndicator color={COLORS.bg} /></View> : null}
            </View>
            <Pressable style={styles.cameraBadge} onPress={pickPhoto} hitSlop={8}>
              <Ionicons name="camera" size={14} color={COLORS.bg} />
            </Pressable>
          </View>
          <Text style={styles.changePhoto} onPress={pickPhoto}>Change photo</Text>
          <Pressable style={styles.frameBtn} onPress={() => router.push(`/admin-expert-frame/${id}`)}>
            <Ionicons name="crop-outline" size={16} color={COLORS.ink} />
            <Text style={styles.frameBtnText}>Adjust framing</Text>
          </Pressable>
          <Pressable style={styles.frameBtn} onPress={() => router.push(`/admin-expert-services/${id}`)}>
            <Ionicons name="pricetags-outline" size={16} color={COLORS.ink} />
            <Text style={styles.frameBtnText}>Sessions and prices</Text>
          </Pressable>
          <Pressable style={styles.frameBtn} onPress={() => router.push(`/admin-expert-events/${id}`)}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.ink} />
            <Text style={styles.frameBtnText}>Classes and programs</Text>
          </Pressable>

          {/* Language tab for the four content fields below. Labels stay
              English per admin rules. Only the input values swap. */}
          <View style={styles.tabBar}>
            <Pressable
              onPress={() => setLang('en')}
              style={[styles.tab, lang === 'en' && styles.tabOn]}
            >
              <Text style={[styles.tabText, lang === 'en' && styles.tabTextOn]}>English</Text>
            </Pressable>
            <Pressable
              onPress={() => setLang('ar')}
              style={[styles.tab, lang === 'ar' && styles.tabOn]}
            >
              <Text style={[styles.tabText, lang === 'ar' && styles.tabTextOn]}>Arabic</Text>
            </Pressable>
          </View>

          {isAr ? (
            <>
              <Field label="Name" value={arName} onChangeText={setArName} rtl />
              <Field label="Title" value={arTitle} onChangeText={setArTitle} rtl />
              <Field label="Short blurb" value={arBlurb} onChangeText={setArBlurb} multiline rtl />
              <Field label="Bio / approach" value={arBio} onChangeText={setArBio} multiline tall rtl />
            </>
          ) : (
            <>
              <Field label="Name" value={name} onChangeText={setName} />
              <Field label="Title" value={title} onChangeText={setTitle} />
              <Field label="Short blurb" value={blurb} onChangeText={setBlurb} multiline />
              <Field label="Bio / approach" value={bio} onChangeText={setBio} multiline tall />
            </>
          )}

          <Text style={styles.groupLabel}>WHERE TO FIND THEM</Text>
          <Text style={styles.groupNote}>
            Paste the whole profile address. Only the ones filled in show on their profile.
          </Text>
          <Field label="Instagram profile URL" value={instagram} onChangeText={setInstagram} />
          <Field label="TikTok profile URL" value={tiktok} onChangeText={setTiktok} />
          <Field label="X profile URL" value={twitter} onChangeText={setTwitter} />
          <Field label="Linked account email (gives this person their expert panel)" value={accountEmail} onChangeText={setAccountEmail} autoCapitalize="none" keyboardType="email-address" />
          {user?.email ? (
            <Pressable
              onPress={async () => {
                const mine = user.email!.toLowerCase();
                setAccountEmail(mine);
                const { error } = await updateExpert(id, { account_email: mine });
                setStatus(error ? `Link failed: ${error.message}` : 'Linked to your account. Open the Expert panel from the You tab.');
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 4 }}
            >
              <Ionicons name="person-circle-outline" size={16} color={COLORS.accent} />
              <Text style={{ fontSize: 13, color: COLORS.accent }}>Use my account email ({user.email})</Text>
            </Pressable>
          ) : null}

          <Pressable style={styles.saveBtn} onPress={save} disabled={busy}>
            {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.saveText}>Save changes</Text>}
          </Pressable>
          {status ? <Text style={styles.status}>{status}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label, value, onChangeText, multiline, tall, rtl, autoCapitalize, keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  multiline?: boolean;
  tall?: boolean;
  rtl?: boolean;
  autoCapitalize?: any;
  keyboardType?: any;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        style={[
          styles.input,
          multiline && styles.inputMulti,
          tall && styles.inputTall,
          rtl && AR_INPUT,
        ]}
        placeholderTextColor={COLORS.muted}
      />
    </View>
  );
}

function BackBar({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.backBar} onPress={onPress} hitSlop={10}>
      <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
      <Text style={styles.backText}>Experts</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  groupLabel: { fontSize: 10, letterSpacing: 2.4, color: COLORS.muted, marginTop: 22, marginBottom: 8 },
  groupNote: { fontSize: 12, lineHeight: 18, color: COLORS.muted, marginBottom: 12 },
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 15, color: COLORS.muted },
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  head: { alignSelf: 'center', marginTop: 8 },
  frameBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, marginTop: 10, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line },
  frameBtnText: { fontSize: 14, color: COLORS.ink },
  avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontFamily: FONT_SERIF, fontSize: 34, color: COLORS.accent },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.45)', alignItems: 'center', justifyContent: 'center' },
  cameraBadge: { position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.bg },
  changePhoto: { alignSelf: 'center', color: COLORS.accent, fontSize: 14, marginTop: 12, marginBottom: 18 },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 999, padding: 4, borderWidth: 1, borderColor: COLORS.line, marginBottom: 18, marginTop: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  tabOn: { backgroundColor: COLORS.ink },
  tabText: { fontSize: 14, color: COLORS.ink },
  tabTextOn: { color: COLORS.bg },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  input: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: COLORS.ink },
  inputMulti: { minHeight: 70, textAlignVertical: 'top' },
  inputTall: { minHeight: 160 },
  saveBtn: { marginTop: 10, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.taupeBlue, alignItems: 'center' },
  saveText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  status: { fontSize: 14, lineHeight: 20, color: COLORS.ink, marginTop: 14, textAlign: 'center' },
});
