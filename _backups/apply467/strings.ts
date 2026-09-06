// The translation dictionary. Keys are dotted paths so strings live next to
// what they mean and stay easy to find. English first, Arabic second, more
// languages added later if needed.
//
// Voice for Arabic:
//   Honest, calm, effortless, non-promotional. MSA with light Khaleeji
//   warmth. Never word-for-word from English; adapt to sound natural.
//   Feminine second person by default. Letter-spacing zero on Arabic type
//   (set at the style level, not here).
//
// New keys are added as each screen is translated. This file is expected to
// grow substantially over the coming stages of the migration.

type Entry = { en: string; ar: string };

export const STRINGS = {
  // Common controls
  'common.continue':      { en: 'Continue',       ar: 'متابعة' },
  'common.cancel':        { en: 'Cancel',         ar: 'إلغاء' },
  'common.close':         { en: 'Close',          ar: 'إغلاق' },

  // Settings modal
  'settings.title':         { en: 'Settings',              ar: 'الإعدادات' },
  'settings.personalInfo':  { en: 'Personal information',  ar: 'المعلومات الشخصية' },
  'settings.adminPanel':    { en: 'Admin panel',           ar: 'لوحة الإدارة' },
  'settings.expertPanel':   { en: 'Expert panel',          ar: 'لوحة الخبيرة' },
  'settings.myOrders':      { en: 'My orders',             ar: 'طلباتي' },
  'settings.helpSupport':   { en: 'Help & support',        ar: 'المساعدة والدعم' },
  'settings.privacy':       { en: 'Privacy',               ar: 'الخصوصية' },
  'settings.signOut':       { en: 'Sign out',              ar: 'تسجيل الخروج' },
  'settings.signIn':        { en: 'Sign in',               ar: 'تسجيل الدخول' },
  'settings.language':      { en: 'Language',              ar: 'اللغة' },

  // Language switch sheet
  'language.title':         { en: 'Language',              ar: 'اللغة' },
  'language.subtitle':      { en: 'Choose your language',  ar: 'اختاري لغتكِ' },
  'language.restartNote':   { en: 'The app will restart so the new language takes effect.', ar: 'سنُعيد تشغيل التطبيق حتى تتغيّر اللغة.' },
  'language.english':       { en: 'English',               ar: 'English' },
  'language.arabic':        { en: 'Arabic',                ar: 'العربية' },
} as const satisfies Record<string, Entry>;

export type StringKey = keyof typeof STRINGS;
