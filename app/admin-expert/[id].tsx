import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { updateExpert, uploadExpertImage, useExpert } from '@/lib/experts';

export default function AdminExpertEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role } = useAuth();
  const { expert, loading } = useExpert(id);

  const [filled, setFilled] = useState(false);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [blurb, setBlurb] = useState('');
  const [bio, setBio] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (expert && !filled) {
      setName(expert.name);
      setTitle(expert.title);
      setBlurb(expert.blurb);
      setBio(expert.bio);
      setAccountEmail(expert.accountEmail ?? '');
      setPhoto(expert.photo);
      setFilled(true);
    }
  }, [expert, filled]);

  if (role !== 'admin') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackBar onPress={() => router.back()} />
        <View style={styles.center}><Text style={styles.muted}>Admins only.</Text></View>
      </SafeAreaView>
    );
  }

  if (loading || !expert) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackBar onPress={() => router.back()} />
        <View style={styles.center}><ActivityIndicator color={COLORS.accent} /></View>
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
      const url = await uploadExpertImage(expert.id, res.assets[0].base64);
      setPhoto(url);
    } catch (e) {
      setStatus('Photo upload failed.');
    }
    setUploading(false);
  };

  const save = async () => {
    setBusy(true);
    setStatus(null);
    const { error } = await updateExpert(expert.id, {
      name, title, blurb, bio, photo: photo ?? undefined, account_email: accountEmail.trim().toLowerCase(),
    });
    setStatus(error ? `Save failed: ${error.message}` : 'Saved. Changes are live across the app.');
    setBusy(false);
  };

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

          <Field label="Name" value={name} onChangeText={setName} />
          <Field label="Title" value={title} onChangeText={setTitle} />
          <Field label="Short blurb" value={blurb} onChangeText={setBlurb} multiline />
          <Field label="Bio / approach" value={bio} onChangeText={setBio} multiline tall />
          <Field label="Linked account email (gives this person their expert panel)" value={accountEmail} onChangeText={setAccountEmail} autoCapitalize="none" keyboardType="email-address" />

          <Pressable style={styles.saveBtn} onPress={save} disabled={busy}>
            {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.saveText}>Save changes</Text>}
          </Pressable>
          {status ? <Text style={styles.status}>{status}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, multiline, tall, autoCapitalize, keyboardType }: { label: string; value: string; onChangeText: (t: string) => void; multiline?: boolean; tall?: boolean; autoCapitalize?: any; keyboardType?: any }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.inputMulti, tall && styles.inputTall]}
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
  safe: { flex: 1, backgroundColor: COLORS.bg },
  backBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 15, color: COLORS.muted },
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  head: { alignSelf: 'center', marginTop: 8 },
  avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontFamily: FONT_SERIF, fontSize: 34, color: COLORS.accent },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(43,38,34,0.45)', alignItems: 'center', justifyContent: 'center' },
  cameraBadge: { position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.bg },
  changePhoto: { alignSelf: 'center', color: COLORS.accent, fontSize: 14, marginTop: 12, marginBottom: 18 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  input: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: COLORS.ink },
  inputMulti: { minHeight: 70, textAlignVertical: 'top' },
  inputTall: { minHeight: 160 },
  saveBtn: { marginTop: 10, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.accent, alignItems: 'center' },
  saveText: { color: COLORS.bg, fontSize: 15, letterSpacing: 0.5 },
  status: { fontSize: 14, lineHeight: 20, color: COLORS.ink, marginTop: 14, textAlign: 'center' },
});
