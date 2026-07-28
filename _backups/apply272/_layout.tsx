import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import { StripeProvider } from '@stripe/stripe-react-native';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { STRIPE_PUBLISHABLE_KEY } from '@/constants/stripe';
import * as SplashScreen from 'expo-splash-screen';
import { usePushRegistration } from '@/lib/notifications';
import { useAuth } from '@/lib/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { CormorantGaramond_500Medium_Italic } from '@expo-google-fonts/cormorant-garamond';
import { PinyonScript_400Regular } from '@expo-google-fonts/pinyon-script';

// Keep the native splash up until the app is ready, then lift it. No animated
// intro: the app opens straight to the tabs. The login screen is shown once, on
// the very first launch, and never again once it has been seen or skipped.
const WELCOME_KEY = 'intend.welcomeSeen';
SplashScreen.preventAutoHideAsync().catch(() => {});

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
  usePushRegistration();
  const { session, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);
  const sentToWelcome = useRef(false);

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    CormorantGaramond_500Medium_Italic,
    PinyonScript_400Regular,
  });

  // Read the first-launch flag. On any failure we assume it has been seen, so a
  // storage problem can never trap someone on the login screen.
  useEffect(() => {
    AsyncStorage.getItem(WELCOME_KEY)
      .then((v) => setWelcomeSeen(v === '1'))
      .catch(() => setWelcomeSeen(true));
  }, []);

  // The navigator is not ready on the very first render; wait one tick.
  useEffect(() => { setMounted(true); }, []);

  // Lift the native splash as soon as the app is mounted and auth has settled.
  // This deliberately does not wait on the welcome flag.
  useEffect(() => {
    if (!mounted || loading || !fontsLoaded) return;
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 60);
    return () => clearTimeout(t);
  }, [mounted, loading, fontsLoaded]);

  // First launch only: send them to login so they can sign up, sign in, or skip.
  // The flag is written as we go, so this happens exactly once on the device.
  // Gating on `mounted` avoids navigating before the Root Layout navigator exists.
  useEffect(() => {
    if (!mounted || loading || welcomeSeen === null) return;
    if (session || welcomeSeen || sentToWelcome.current) return;
    sentToWelcome.current = true;
    AsyncStorage.setItem(WELCOME_KEY, '1').catch(() => {});
    router.replace('/login?first=1');
  }, [mounted, loading, session, welcomeSeen]);

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
        <Stack
          screenOptions={{
            animation: 'fade',
            animationDuration: 260,
            contentStyle: { backgroundColor: '#F7F2EA' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </StripeProvider>
  );
}

