import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import { Splash } from '@/components/Splash';
import { MiniPlayer } from '@/components/MiniPlayer';
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
import { ReemKufi_500Medium } from '@expo-google-fonts/reem-kufi';
import { IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium } from '@expo-google-fonts/ibm-plex-sans-arabic';
import { initI18n } from '@/lib/i18n';
import { startIap, stopIap } from '@/lib/iap';
import { wireProgramPurchases } from '@/lib/programs';
import * as Notifications from 'expo-notifications';
import { scheduleArticleDigest } from '@/lib/articleDigest';
import { useArticles } from '@/lib/articles';

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
  const digestRouter = useRouter();
  const { items: digestArticles } = useArticles();

  // Any notification carrying a route goes there when tapped.
  useEffect(() => {
    const open = (res: any) => {
      const route = res?.notification?.request?.content?.data?.route;
      if (typeof route === 'string' && route.startsWith('/')) {
        setTimeout(() => { try { digestRouter.push(route as any); } catch {} }, 60);
      }
    };

    // One that arrives while the app is running.
    const sub = Notifications.addNotificationResponseReceivedListener(open);

    // And one that opened the app from cold, which has already been delivered
    // by the time we start listening.
    Notifications.getLastNotificationResponseAsync().then((res) => { if (res) open(res); });

    return () => { sub.remove(); };
  }, [digestRouter]);

  // A month of them, refreshed whenever the app opens, so the newest article is
  // the one that comes up next.
  useEffect(() => {
    if (!digestArticles?.length) return;
    scheduleArticleDigest(
      digestArticles.slice(0, 12).map((a: any) => ({ id: a.id, title: a.title, excerpt: a.excerpt })),
    );
  }, [digestArticles?.length]);

  // Before anyone can buy, and early enough to catch a purchase that finished
  // while the app was closed.
  useEffect(() => {
    wireProgramPurchases();
    startIap();
    return () => { stopIap(); };
  }, []);

  const colorScheme = useColorScheme();
  const router = useRouter();
  usePushRegistration();
  const { session, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);
  const sentToWelcome = useRef(false);

  // A ceiling on waiting for fonts. If they fail, the app opens in the fallback
  // face rather than never opening at all.
  const [fontWaited, setFontWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontWaited(true), 4000);
    return () => clearTimeout(t);
  }, []);

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
    ReemKufi_500Medium,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
  });

  // The language system is bilingual. On first render, this reads the stored
  // choice and syncs the RTL flag. If they diverge (someone changed language
  // last session), initI18n reloads the app to bring them in line.
  const [i18nReady, setI18nReady] = useState(false);
  useEffect(() => { initI18n().then(() => setI18nReady(true)).catch(() => setI18nReady(true)); }, []);

  const fontsReady = fontsLoaded || fontWaited;

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
    if (!mounted || loading || !fontsReady || !i18nReady) return;
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 60);
    return () => clearTimeout(t);
  }, [mounted, loading, fontsReady, i18nReady]);

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

  // Held behind the splash until the type is ready.
  if (!fontsReady) return null;

  return (
    <SafeAreaProvider>
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
        <MiniPlayer />
        <Splash />
      </ThemeProvider>
    </StripeProvider>
    </SafeAreaProvider>
  );
}

