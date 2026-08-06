import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image } from '@/components/Img';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { signIn, signUp, useAuth, sendPasswordReset } from '@/lib/auth';

const SKY = require('@/assets/images/welcome-sky.jpg');

// Enough to hold white type over the brightest part of the gradient, without
// flattening the colour out of it. Slightly heavier top and bottom, where the
// status bar and the button sit.
const SCRIM = ['rgba(28,24,20,0.40)', 'rgba(28,24,20,0.22)', 'rgba(28,24,20,0.42)'];

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

  useEffect(() => {
    if (!loading && session) router.replace('/(tabs)');
  }, [session, loading]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const forgotPassword = async () => {
    setError(null); setNotice(null);
    if (!email.trim()) { setError('Enter your email above, then tap Forgot password.'); return; }
    setBusy(true);
    const { error: e } = await sendPasswordReset(email);
    setBusy(false);
    if (e) setError(e.message || 'Could not send the reset email. Please try again.');
    else setNotice('Check your inbox for a link to reset your password.');
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
          setError('Please confirm your email first. We sent a confirmation link to your inbox when you signed up.');
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
        setNotice('Account created. Check your inbox to confirm your email, then sign in.');
        setMode('in');
        setBusy(false);
        return;
      }

      // Success: go straight to the app, do not wait on the auth listener.
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <Image source={SKY} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient colors={SCRIM} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={12}>
          <Text style={styles.skip}>Skip for now</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inner}>
          <Text style={styles.kicker}>THE INTEND</Text>
          <Text style={styles.h1}>{mode === 'in' ? 'Welcome back' : 'Welcome'}</Text>
          <Text style={styles.sub}>
            {mode === 'in' ? 'Sign in to continue your journey.' : 'A calm home for your practice.'}
          </Text>

          {mode === 'up' ? (
            <Input label="Name" value={name} onChangeText={setName} placeholder="Your name" />
          ) : null}
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
          <PasswordInput value={password} onChangeText={setPassword} />
          {mode === 'in' ? (
            <Pressable onPress={forgotPassword} style={styles.forgot} hitSlop={8}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          ) : null}

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
            {busy ? <ActivityIndicator color={COLORS.ink} /> : <Text style={styles.btnText}>{mode === 'in' ? 'Sign in' : 'Create account'}</Text>}
          </Pressable>

          <Pressable onPress={() => { setMode(mode === 'in' ? 'up' : 'in'); setError(null); setNotice(null); setPassword(''); setName(''); }} style={styles.toggle}>
            <Text style={styles.toggleText}>
              {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Input(props: any) {
  const { label, ...rest } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput {...rest} placeholderTextColor="rgba(255,255,255,0.55)" style={styles.input} />
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
          placeholderTextColor="rgba(255,255,255,0.55)"
          secureTextEntry={!show}
          autoCapitalize="none"
          style={styles.pwInput}
        />
        <Pressable onPress={() => setShow((v) => !v)} hitSlop={10} style={styles.eyeBtn}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.ink },
  safe: { flex: 1 },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 4 },
  skip: { fontSize: 15, color: 'rgba(255,255,255,0.8)' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },

  kicker: { fontSize: 11, letterSpacing: 3, color: 'rgba(255,255,255,0.65)', marginBottom: 14, textAlign: 'center' },
  h1: { fontFamily: FONT_SERIF, fontSize: 42, lineHeight: 48, color: '#FFFFFF', textAlign: 'center' },
  sub: { fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.75)', marginTop: 10, marginBottom: 30, textAlign: 'center' },

  // Dim, so they read as fields to fill rather than things to press.
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  input: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: '#FFFFFF' },
  pwWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', paddingRight: 10 },
  pwInput: { flex: 1, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: '#FFFFFF' },
  eyeBtn: { padding: 6 },

  errorBox: { backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(248,217,208,0.45)', borderRadius: 12, padding: 14, marginTop: 6, marginBottom: 4 },
  errorText: { fontSize: 14, lineHeight: 20, color: '#F8D9D0' },
  noticeBox: { backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', borderRadius: 12, padding: 14, marginTop: 6, marginBottom: 4 },
  noticeText: { fontSize: 14, lineHeight: 20, color: '#FFFFFF' },

  // Bright frosted with ink type. White type on a light panel measures 3.7 to
  // 1, under the 4.5 floor, so it could not stay white.
  btn: { marginTop: 14, paddingVertical: 16, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center' },
  btnOff: { opacity: 0.6 },
  btnText: { color: COLORS.ink, fontSize: 16, letterSpacing: 0.5 },

  forgot: { alignSelf: 'flex-end', marginTop: 10, marginBottom: 2 },
  forgotText: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  toggle: { marginTop: 20, alignItems: 'center' },
  toggleText: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
});
