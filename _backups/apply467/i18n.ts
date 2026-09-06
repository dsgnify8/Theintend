// The whole language system in one file. The app is bilingual (English and
// Arabic), and Arabic requires an RTL layout that only takes effect after a
// native restart. So switching language:
//   1) persists the choice
//   2) sets the native RTL flag
//   3) reloads the app
// The user sees the splash for about a second and comes back in the new
// language and direction.
//
// t() falls back to English for any Arabic string that has not been
// translated yet, and to the key itself if the key is unknown, so a missing
// entry is visible in the UI rather than crashing.

import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { useSyncExternalStore } from 'react';
import { STRINGS, type StringKey } from '@/constants/strings';

export type Locale = 'en' | 'ar';
const KEY = 'intend.locale';

// Arabic-appropriate fonts. Latin faces do not cover Arabic glyphs at all,
// so text falls back to system defaults if these are not used when the app
// is in Arabic. Exported here so any screen can swap fonts based on isRTL().
export const FONT_SERIF_AR = 'ReemKufi_500Medium';
export const FONT_SANS_AR = 'IBMPlexSansArabic_400Regular';
export const FONT_SANS_AR_MEDIUM = 'IBMPlexSansArabic_500Medium';

let current: Locale = 'en';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// Called once from the root layout before rendering. Reads the stored choice
// and, if the RTL flag on the device does not match, reloads the app to
// bring them in line. On the very first launch (nothing stored yet), skips
// the reload since a reload loop would trap us.
export async function initI18n(): Promise<void> {
  let stored: string | null = null;
  try { stored = await AsyncStorage.getItem(KEY); } catch {}
  if (stored === 'ar' || stored === 'en') current = stored;
  const shouldBeRTL = current === 'ar';
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
    if (stored) {
      try { await Updates.reloadAsync(); return; } catch {}
    }
  }
  emit();
}

export function getLocale(): Locale { return current; }
export function isRTL(): boolean { return current === 'ar'; }

// Change the language. Restarts the app so the new direction and strings
// come in together.
export async function setLocale(next: Locale): Promise<void> {
  if (next === current) return;
  try { await AsyncStorage.setItem(KEY, next); } catch {}
  current = next;
  const rtl = next === 'ar';
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  try {
    await Updates.reloadAsync();
  } catch {
    // Reload failed. The choice is saved; the next manual restart picks it up.
    emit();
  }
}

// Subscribe to changes. Screens rarely use this because setLocale reloads,
// but the hook is here for completeness.
export function useLocale(): Locale {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => current,
  );
}

// Look up a string.
export function t(key: StringKey): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[current] ?? entry.en ?? key;
}
