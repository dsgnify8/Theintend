// The whole language system in one file. The app is bilingual (English and
// Arabic). Layout stays LTR always. The tab bar, cards, and structural
// containers do not flip. Arabic renders right-to-left inside each Text
// component (the OS handles glyph shaping), and screens opt individual
// paragraphs and headings into right alignment via the AR_TEXT helper.
//
// Language switch reloads the app so every screen using bare t() imports
// picks up the new strings. Direction of the layout itself does not change,
// which keeps navigation exactly where users expect it in both languages.
//
// t() supports {var} interpolation: t('booking.withExpert', { name: 'Joanna' })
// t() falls back to English for any Arabic string that has not been translated
// yet, and to the key itself if the key is unknown, so a missing entry is
// visible in the UI rather than crashing.

import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { useSyncExternalStore } from 'react';
import { STRINGS, type StringKey } from '@/constants/strings';

export type Locale = 'en' | 'ar';
const KEY = 'intend.locale';

// Arabic-appropriate fonts. Latin faces do not cover Arabic glyphs at all,
// so text falls back to system defaults if these are not used when the app
// is in Arabic. Exported so any screen can swap fonts based on isRTL().
export const FONT_SERIF_AR = 'ReemKufi_500Medium';
export const FONT_SANS_AR = 'IBMPlexSansArabic_400Regular';
export const FONT_SANS_AR_MEDIUM = 'IBMPlexSansArabic_500Medium';

// Style spread for paragraph and heading text that should read right-aligned
// in Arabic. Includes writingDirection so Arabic-in-English-container flows
// correctly, and letterSpacing:0 because Arabic is cursive and tracking
// breaks the letter joins.
export const AR_TEXT = { textAlign: 'right' as const, writingDirection: 'rtl' as const, letterSpacing: 0 };

let current: Locale = 'en';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// Called once from the root layout before rendering. Reads the stored choice.
// If a previous version of the app forced RTL layout, this undoes it and
// reloads once so the LTR layout takes hold; subsequent launches are quiet.
export async function initI18n(): Promise<void> {
  // Undo the RTL flag left over from earlier versions that used forceRTL.
  // Layout stays LTR now for every language.
  if (I18nManager.isRTL) {
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
    try { await Updates.reloadAsync(); return; } catch {}
  }
  let stored: string | null = null;
  try { stored = await AsyncStorage.getItem(KEY); } catch {}
  if (stored === 'ar' || stored === 'en') current = stored;
  emit();
}

export function getLocale(): Locale { return current; }
export function isRTL(): boolean { return current === 'ar'; }

// Change the language. Persists the choice and reloads the app so bare t()
// imports across every screen pick up the new strings on next render.
export async function setLocale(next: Locale): Promise<void> {
  if (next === current) return;
  try { await AsyncStorage.setItem(KEY, next); } catch {}
  current = next;
  try {
    await Updates.reloadAsync();
  } catch {
    // Reload failed (dev environment or offline OTA check). The choice is
    // saved; the next manual restart picks it up. Emit for hook subscribers.
    emit();
  }
}

// Subscribe to changes. Screens rarely use this because setLocale reloads,
// but the hook is here for components that want to react without a restart.
export function useLocale(): Locale {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => current,
  );
}

// Look up a string. Supports {name} style interpolation.
export function t(key: StringKey, vars?: Record<string, string | number>): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  let s = entry[current] ?? entry.en ?? key;
  if (vars) {
    for (const k of Object.keys(vars)) {
      s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
    }
  }
  return s;
}
