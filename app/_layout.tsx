import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { StripeProvider } from '@stripe/stripe-react-native';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { STRIPE_PUBLISHABLE_KEY } from '@/constants/stripe';
import { AnimatedIntro } from '@/components/AnimatedIntro';
import { usePushRegistration } from '@/lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const unstable_settings = {
  anchor: '(tabs)',
};

function paramsFromUrl(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const grab = (str?: string) => {
    if (!str) return;
    str.split('&').forEach((kv) => {
      const [k, v] = kv.split('=');
      if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
    });
  };
  grab(url.split('?')[1]?.split('#')[0]);
  grab(url.split('#')[1]);
  return out;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [introDone, setIntroDone] = useState(false);
  usePushRegistration();

  // After the intro: on the very first open, show the sign-up screen once
  // (with its Skip for now). Afterwards it never shows again.
  const handleIntroDone = async () => {
    setIntroDone(true);
    try {
      const seen = await AsyncStorage.getItem('ti_seen_intro');
      if (!seen) {
        await AsyncStorage.setItem('ti_seen_intro', '1');
        router.push('/login');
      }
    } catch {}
  };

  useEffect(() => {
    const handle = (url: string | null) => {
      if (!url) return;
      const p = paramsFromUrl(url);
      if (p.type === 'recovery' && p.access_token && p.refresh_token) {
        supabase.auth
          .setSession({ access_token: p.access_token, refresh_token: p.refresh_token })
          .then(() => router.push('/reset-password'))
          .catch(() => {});
      }
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, []);

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.theintend.app"
      urlScheme="theintend"
    >
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
        {!introDone ? <AnimatedIntro onDone={handleIntroDone} /> : null}
      </ThemeProvider>
    </StripeProvider>
  );
}
