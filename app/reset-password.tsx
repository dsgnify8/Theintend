import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { COLORS, FONT_SERIF } from '@/constants/brand';
import { updatePassword } from '@/lib/auth';

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    if (password.length < 6) { setError('Use at least 6 characters.'); return; }
    if (password !== confirm) { setError('The passwords do not match.'); return; }
    setBusy(true);
    const { error: e } = await updatePassword(password);
    setBusy(false);
    if (e) { setError(e.message || 'Could not update your password. Please try again.'); return; }
    setDone(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.inner}>
        <Text style={styles.kicker}>THE INTEND</Text>
        <Text style={styles.h1}>{done ? 'Password updated' : 'Set a new password'}</Text>
        {done ? (
          <>
            <Text style={styles.sub}>You can sign in with your new password from now on.</Text>
            <Pressable style={styles.btn} onPress={() => router.replace('/(tabs)')}>
              <Text style={styles.btnText}>Continue</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.sub}>Choose a new password for your account.</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>New password</Text>
              <TextInput value={password} onChangeText={setPassword} placeholder="At least 6 characters" placeholderTextColor={COLORS.muted} secureTextEntry autoCapitalize="none" style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Confirm password</Text>
              <TextInput value={confirm} onChangeText={setConfirm} placeholder="Re-enter password" placeholderTextColor={COLORS.muted} secureTextEntry autoCapitalize="none" style={styles.input} />
            </View>
            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
            <Pressable style={[styles.btn, busy && styles.btnOff]} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.btnText}>Update password</Text>}
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  kicker: { fontSize: 12, letterSpacing: 3, color: COLORS.muted, marginBottom: 12 },
  h1: { fontFamily: FONT_SERIF, fontSize: 32, lineHeight: 38, color: COLORS.ink },
  sub: { fontSize: 15, lineHeight: 22, color: COLORS.muted, marginTop: 8, marginBottom: 24 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  input: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: COLORS.ink },
  errorBox: { backgroundColor: '#F6E5E0', borderRadius: 12, padding: 14, marginBottom: 8 },
  errorText: { fontSize: 14, lineHeight: 20, color: '#8F4A3B' },
  btn: { marginTop: 8, paddingVertical: 16, borderRadius: 999, backgroundColor: COLORS.taupeBlue, alignItems: 'center' },
  btnOff: { opacity: 0.6 },
  btnText: { color: COLORS.bg, fontSize: 16, letterSpacing: 0.5 },
});
