import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { useAuth, updateProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const LANGS = ['English', 'Svenska', 'فارسی'];
const LANG_KEY = 'intend.language.v1';

export default function PersonalInfo() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [name, setName] = useState('');
  const [lang, setLang] = useState('English');
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');

  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => { setName(profile?.full_name ?? ''); }, [profile?.full_name]);
  useEffect(() => { AsyncStorage.getItem(LANG_KEY).then((v) => { if (v) setLang(v); }); }, []);

  const saveName = async () => {
    setSavingName(true); setNameMsg(null);
    const { error } = await updateProfile({ full_name: name.trim() });
    setNameMsg(error ? 'Could not save your name.' : 'Saved.');
    setSavingName(false);
  };

  const pickLang = async (l: string) => {
    setLang(l);
    await AsyncStorage.setItem(LANG_KEY, l).catch(() => {});
  };

  const changePassword = async () => {
    setPassMsg(null);
    if (pass1.length < 6) { setPassMsg('Password must be at least 6 characters.'); return; }
    if (pass1 !== pass2) { setPassMsg('The two passwords do not match.'); return; }
    setSavingPass(true);
    const { error } = await supabase.auth.updateUser({ password: pass1 });
    if (error) setPassMsg(error.message);
    else { setPassMsg('Password updated.'); setPass1(''); setPass2(''); }
    setSavingPass(false);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackBar router={router} />
        <View style={styles.center}><Text style={styles.muted}>Sign in to manage your information.</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <BackBar router={router} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>ACCOUNT</Text>
          <Text style={styles.h1}>Personal information</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={COLORS.muted} />
          <Pressable style={[styles.btn, savingName && styles.btnOff]} onPress={saveName} disabled={savingName}>
            {savingName ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.btnText}>Save name</Text>}
          </Pressable>
          {nameMsg ? <Text style={styles.msg}>{nameMsg}</Text> : null}

          <Text style={styles.label}>Email</Text>
          <View style={styles.readonly}><Text style={styles.readonlyText}>{user.email}</Text></View>
          <Text style={styles.hint}>To change your email, contact support for now.</Text>

          <Text style={styles.label}>Language</Text>
          <View style={styles.langRow}>
            {LANGS.map((l) => {
              const on = l === lang;
              return (
                <Pressable key={l} onPress={() => pickLang(l)} style={[styles.langChip, on && styles.langChipOn]}>
                  <Text style={[styles.langText, on && styles.langTextOn]}>{l}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 28 }]}>Change password</Text>
          <TextInput style={styles.input} value={pass1} onChangeText={setPass1} placeholder="New password" placeholderTextColor={COLORS.muted} secureTextEntry autoCapitalize="none" />
          <TextInput style={styles.input} value={pass2} onChangeText={setPass2} placeholder="Confirm new password" placeholderTextColor={COLORS.muted} secureTextEntry autoCapitalize="none" />
          <Pressable style={[styles.btn, savingPass && styles.btnOff]} onPress={changePassword} disabled={savingPass}>
            {savingPass ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.btnText}>Update password</Text>}
          </Pressable>
          {passMsg ? <Text style={styles.msg}>{passMsg}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function BackBar({ router }: { router: any }) {
  return (
    <Pressable style={styles.back} onPress={() => router.back()} hitSlop={12}>
      <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
      <Text style={styles.backText}>You</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  back: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  backText: { fontSize: 16, color: COLORS.ink, marginLeft: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  muted: { fontSize: 15, color: COLORS.muted, textAlign: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginBottom: 8 },
  h1: { fontFamily: FONT_SERIF, fontSize: 30, color: COLORS.ink, marginBottom: 22 },
  label: { fontSize: 13, color: COLORS.muted, marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: COLORS.ink, marginBottom: 10 },
  readonly: { backgroundColor: COLORS.accentSoft, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16 },
  readonlyText: { fontSize: 16, color: COLORS.ink },
  hint: { fontSize: 12, color: COLORS.muted, marginTop: 6 },
  langRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  langChip: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line },
  langChipOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  langText: { fontSize: 14, color: COLORS.ink },
  langTextOn: { color: COLORS.bg },
  btn: { backgroundColor: COLORS.accent, paddingVertical: 15, borderRadius: 999, alignItems: 'center', marginTop: 4 },
  btnOff: { opacity: 0.6 },
  btnText: { color: COLORS.bg, fontSize: 15 },
  msg: { fontSize: 13, color: COLORS.accent, marginTop: 8 },
});

