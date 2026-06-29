import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, Stack } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { signIn, signUp, useAuth } from '@/lib/auth';

export default function Login() {
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Redirect href="/(tabs)" />;

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res =
      mode === 'in'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, name.trim());
    if (res.error) setError(res.error.message);
    else if (mode === 'up' && !res.data.session) {
      setError('Account created. Please check your email to confirm, then sign in.');
      setMode('in');
    }
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
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
          <Input label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry autoCapitalize="none" />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.btn} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.btnText}>{mode === 'in' ? 'Sign in' : 'Create account'}</Text>}
          </Pressable>

          <Pressable onPress={() => { setMode(mode === 'in' ? 'up' : 'in'); setError(null); }} style={styles.toggle}>
            <Text style={styles.toggleText}>
              {mode === 'in' ? "New here? Create an account" : 'Already have an account? Sign in'}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginBottom: 12 },
  h1: { fontFamily: FONT_SERIF, fontSize: 34, lineHeight: 40, color: COLORS.ink },
  sub: { fontSize: 15, lineHeight: 22, color: COLORS.muted, marginTop: 8, marginBottom: 28 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  input: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: COLORS.ink },
  error: { fontSize: 13, lineHeight: 19, color: '#9B5A4A', marginTop: 4, marginBottom: 8 },
  btn: { marginTop: 14, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.accent, alignItems: 'center' },
  btnText: { color: COLORS.bg, fontSize: 16, letterSpacing: 0.5 },
  toggle: { marginTop: 20, alignItems: 'center' },
  toggleText: { fontSize: 14, color: COLORS.accent },
});
