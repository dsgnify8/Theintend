import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { COLORS } from '@/constants/brand';
import { useAuth } from '@/lib/auth';
import { useHasOnboarded } from '@/lib/affirmations';

// Entry point for "I Am". First visit (no profile) -> onboarding. After that,
// straight to the scroll.
export default function AffirmationsEntry() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { loading, onboarded } = useHasOnboarded(user?.id);

  useEffect(() => {
    if (authLoading || loading) return;
    if (!user) { router.replace('/login'); return; }
    router.replace(onboarded ? '/affirmations/scroll' : '/affirmations/onboarding');
  }, [authLoading, loading, onboarded, user]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator color={COLORS.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
});

