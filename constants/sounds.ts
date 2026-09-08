// The Intend Sounds and Frequencies (real, uploaded tracks only).
//
// Arabic fields (arTitle, arPurpose, arDuration) are Claude's first-pass
// drafts. Nz to review and polish since these are brand-facing. Empty ar
// fields fall back to the English so nothing goes blank if a translation
// is missing.

import { getLocale } from '@/lib/i18n';

export type Sound = {
  id: string;
  title: string;
  purpose: string;
  category: string; // Focus | Calm | Sleep | Energy
  duration: string;
  color: string;
  url?: string;
  // Bundled artwork. An admin upload under the key sound:<id> wins over it.
  cover?: any;
  // Optional Arabic fields.
  arTitle?: string;
  arPurpose?: string;
  arDuration?: string;
};

// Filter identifiers stay in English so the .filter() comparisons still
// match. Display labels swap via soundCategoryLabel below.
export const SOUND_CATEGORIES = ['All', 'Focus', 'Calm'];

const SOUND_CATEGORY_AR: Record<string, string> = {
  'All': 'الكل',
  'Focus': 'التركيز',
  'Calm': 'الهدوء',
  'Sleep': 'النوم',
  'Energy': 'الطاقة',
};

export function soundCategoryLabel(cat: string): string {
  if (getLocale() !== 'ar') return cat;
  return SOUND_CATEGORY_AR[cat] ?? cat;
}

export const SOUNDS: Sound[] = [
  {
    id: '40hz-gamma',
    title: '40 Hz Binaural Gamma Waves',
    purpose: 'Quiets mental noise and settles you into focus that holds',
    category: 'Focus', duration: '60 min', color: '#5F6B57',
    url: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/sounds/40hz-gamma.mp3',
    cover: require('../assets/images/40hz-gamma-cover.jpg'),
    arTitle: 'موجات غاما ثنائية الأذن 40 هرتز',
    arPurpose: 'يهدّئ الضجيج الذهني ويثبّتكِ في تركيز يدوم',
    arDuration: '60 دقيقة',
  },
  {
    id: 'nervous-system-999',
    title: 'Nervous System Regulation',
    purpose: '999 Hz handpan for settling an activated nervous system',
    category: 'Calm', duration: '60 min', color: '#6E7B85',
    url: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/sounds/nervous-system-999.mp3',
    cover: require('../assets/images/nervous-system-999-cover.jpg'),
    arTitle: 'تنظيم الجهاز العصبي',
    arPurpose: 'هاندبان 999 هرتز لتهدئة جهاز عصبي مُنشَّط',
    arDuration: '60 دقيقة',
  },
  {
    id: 'quantum-focus',
    title: 'Quantum Focus',
    purpose: '13 Hz for focus, concentration and memory',
    category: 'Focus', duration: '90 min', color: '#5C4632',
    url: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/sounds/quantum-focus.mp3',
    cover: require('../assets/images/quantum-focus-cover.jpg'),
    arTitle: 'التركيز الكمّي',
    arPurpose: '13 هرتز للتركيز والانتباه والذاكرة',
    arDuration: '90 دقيقة',
  },
  {
    id: '432hz-energizer',
    title: '432 Hz Mental Energizer',
    purpose: 'Calms your nervous system, sharpens focus and clears mental clutter',
    category: 'Focus', duration: '90 min', color: '#6F7A6B',
    url: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/sounds/432hz-energizer.mp3',
    cover: require('../assets/images/432hz-cover.jpg'),
    arTitle: 'منشّط ذهني 432 هرتز',
    arPurpose: 'يهدّئ جهازكِ العصبي، ويشحذ التركيز، ويصفّي الذهن',
    arDuration: '90 دقيقة',
  },
];

// Locale-aware view of a sound. Screens that display the title, purpose,
// or duration should call this rather than reading the raw fields so the
// app locale is honoured. Empty ar fields fall back to English.
export function localizeSound(s: Sound): Sound {
  if (getLocale() !== 'ar') return s;
  return {
    ...s,
    title: s.arTitle || s.title,
    purpose: s.arPurpose || s.purpose,
    duration: s.arDuration || s.duration,
  };
}
