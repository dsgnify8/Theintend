import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { signIn, signUp, useAuth } from '@/lib/auth';

export default function Login() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Redirect href="/(tabs)" />;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const submit = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    if (mode === 'up' && !name.trim()) { setError('Please enter your name.'); return; }

    setBusy(true);
    try {
      const res =
        mode === 'in'
          ? await signIn(email, password)
          : await signUp(email, password, name);

      if (res.error) {
        const m = res.error.message || 'Something went wrong.';
        if (/already registered|already exists/i.test(m)) {
          setError('An account with this email already exists. Switch to Sign in.');
          setMode('in');
        } else if (/email not confirmed/i.test(m)) {
          setError('This email needs confirming. Turn off "Confirm email" in Supabase, or use a confirmed account.');
        } else if (/invalid login credentials/i.test(m)) {
          setError('Email or password is incorrect.');
        } else {
          setError(m);
        }
        setBusy(false);
        return;
      }

      // Sign-up with email confirmation on returns no session.
      if (mode === 'up' && !res.data?.session) {
        setNotice('Account created. If sign-in does not work, confirm the email or turn off email confirmation in Supabase.');
        setMode('in');
        setBusy(false);
        return;
      }

      // Success: go to the app. (The auth listener also redirects, this is a safety net.)
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={12}>
          <Text style={styles.skip}>Skip for now</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inner}>
          <Text style={styles.kicker}>THE INTEND</Text>
          <Text style={styles.h1}>{mode === 'in' ? 'Welcome back' : 'Create your space'}</Text>
          <Text style={styles.sub}>
            {mode === 'in' ? 'Sign in to continue your journey.' : 'A calm home for your practice.'}
          </Text>

          {mode === 'up' ? (
            <Input label="Name" value={name} onChangeText={setName} placeholder="Your name" />
          ) : null}
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
          <PasswordInput value={password} onChangeText={setPassword} />

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          {notice ? (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          <Pressable style={[styles.btn, busy && styles.btnOff]} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.btnText}>{mode === 'in' ? 'Sign in' : 'Create account'}</Text>}
          </Pressable>

          <Pressable onPress={() => { setMode(mode === 'in' ? 'up' : 'in'); setError(null); setNotice(null); }} style={styles.toggle}>
            <Text style={styles.toggleText}>
              {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Input(props: any) {
  const { label, ...rest } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput {...rest} placeholderTextColor={COLORS.muted} style={styles.input} />
    </View>
  );
}

function PasswordInput({ value, onChangeText }: { value: string; onChangeText: (t: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>Password</Text>
      <View style={styles.pwWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="At least 6 characters"
          placeholderTextColor={COLORS.muted}
          secureTextEntry={!show}
          autoCapitalize="none"
          style={styles.pwInput}
        />
        <Pressable onPress={() => setShow((v) => !v)} hitSlop={10} style={styles.eyeBtn}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 4 },
  skip: { fontSize: 15, color: COLORS.muted },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginBottom: 12 },
  h1: { fontFamily: FONT_SERIF, fontSize: 34, lineHeight: 40, color: COLORS.ink },
  sub: { fontSize: 15, lineHeight: 22, color: COLORS.muted, marginTop: 8, marginBottom: 28 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  input: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: COLORS.ink },
  errorBox: { backgroundColor: '#F6E5E0', borderRadius: 12, padding: 14, marginTop: 6, marginBottom: 4 },
  errorText: { fontSize: 14, lineHeight: 20, color: '#8F4A3B' },
  noticeBox: { backgroundColor: COLORS.accentSoft, borderRadius: 12, padding: 14, marginTop: 6, marginBottom: 4 },
  noticeText: { fontSize: 14, lineHeight: 20, color: COLORS.ink },
  btn: { marginTop: 14, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.accent, alignItems: 'center' },
  btnOff: { opacity: 0.6 },
  btnText: { color: COLORS.bg, fontSize: 16, letterSpacing: 0.5 },
  toggle: { marginTop: 20, alignItems: 'center' },
  toggleText: { fontSize: 14, color: COLORS.accent },
  pwWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, paddingRight: 10 },
  pwInput: { flex: 1, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: COLORS.ink },
  eyeBtn: { padding: 6 },
});
