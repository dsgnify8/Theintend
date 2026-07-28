import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { getExpertForEmail } from '@/lib/experts';
import { submitProfileChange, uploadSubmissionImage } from '@/lib/submissions';
import type { Expert } from '@/constants/experts';

export default function ExpertEdit() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [expert, setExpert] = useState<Expert | null | undefined>(undefined);
  const [filled, setFilled] = useState(false);
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) getExpertForEmail(user.email).then(setExpert);
    else setExpert(null);
  }, [user?.email]);

  useEffect(() => {
    if (expert && !filled) {
      setBio(expert.bio);
      setPhoto(expert.photo);
      setFilled(true);
    }
  }, [expert, filled]);

  if (role !== 'expert' && role !== 'admin') {
    return <Wrap router={router}><View style={styles.center}><Text style={styles.muted}>Experts only.</Text></View></Wrap>;
  }
  if (expert === undefined) {
    return <Wrap router={router}><View style={styles.center}><ActivityIndicator color={COLORS.accent} /></View></Wrap>;
  }
  if (!expert) {
    return <Wrap router={router}><View style={styles.center}><Text style={styles.muted}>Your profile isn't linked yet.</Text></View></Wrap>;
  }

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true });
    if (res.canceled || !res.assets?.[0]?.base64) return;
    setUploading(true);
    setStatus(null);
    try {
      const url = await uploadSubmissionImage(res.assets[0].base64);
      setPhoto(url);
    } catch (e) {
      setStatus('Photo upload failed.');
    }
    setUploading(false);
  };

  const submit = async () => {
    setBusy(true);
    setStatus(null);
    const payload: { bio?: string; photo?: string } = {};
    if (bio !== expert.bio) payload.bio = bio;
    if (photo !== expert.photo && photo) payload.photo = photo;
    if (!payload.bio && !payload.photo) {
      setStatus('Nothing changed yet.');
      setBusy(false);
      return;
    }
    const { error } = await submitProfileChange(expert.id, payload);
    setStatus(error ? `Could not submit: ${error.message}` : 'Submitted. Your changes are pending admin approval.');
    setBusy(false);
  };

  const initials = expert.name.replace('Dr. ', '').split(' ').map((p) => p[0]).slice(0, 2).join('');

  return (
    <Wrap router={router}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.h1}>Edit my profile</Text>
          <Text style={styles.sub}>Changes are reviewed by the team before they go live.</Text>

          <View style={styles.head}>
            <View style={styles.avatar}>
              {photo ? <Image source={{ uri: photo }} style={styles.avatarImg} resizeMode="cover" /> : <Text style={styles.avatarText}>{initials}</Text>}
              {uploading ? <View style={styles.overlay}><ActivityIndicator color={COLORS.bg} /></View> : null}
            </View>
            <Pressable style={styles.cameraBadge} onPress={pickPhoto} hitSlop={8}>
              <Ionicons name="camera" size={14} color={COLORS.bg} />
            </Pressable>
          </View>
          <Text style={styles.changePhoto} onPress={pickPhoto}>Change photo</Text>

          <Text style={styles.fieldLabel}>Bio / approach</Text>
          <TextInput value={bio} onChangeText={setBio} multiline style={[styles.input, styles.tall]} placeholderTextColor={COLORS.muted} />

          <Pressable style={styles.saveBtn} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.saveText}>Submit for approval</Text>}
          </Pressable>
          {status ? <Text style={styles.status}>{status}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Wrap>
  );
}

function Wrap({ children, router }: { children: any; router: any }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable style={styles.backBar} onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
        <Text style={styles.backText}>Expert panel</Text>
      </Pressable>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 15, color: COLORS.muted },
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  h1: { fontFamily: FONT_SERIF, fontSize: 30, color: COLORS.ink, marginBottom: 6 },
  sub: { fontSize: 14, lineHeight: 21, color: COLORS.muted, marginBottom: 16 },
  head: { alignSelf: 'center', marginTop: 6 },
  avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontFamily: FONT_SERIF, fontSize: 34, color: COLORS.accent },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.45)', alignItems: 'center', justifyContent: 'center' },
  cameraBadge: { position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.bg },
  changePhoto: { alignSelf: 'center', color: COLORS.accent, fontSize: 14, marginTop: 12, marginBottom: 18 },
  fieldLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  input: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: COLORS.ink },
  tall: { minHeight: 200, textAlignVertical: 'top', lineHeight: 22 },
  saveBtn: { marginTop: 18, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.accent, alignItems: 'center' },
  saveText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  status: { fontSize: 14, lineHeight: 20, color: COLORS.ink, marginTop: 14, textAlign: 'center' },
});
