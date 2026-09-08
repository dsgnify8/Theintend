// Quote of the day for the homepage. A curated list, one line per day, in
// order. Add or replace lines freely: the rotation adjusts to the length.
// These are not affirmations, though the card still links into I Am.
//
// QUOTES_AR is Claude's first-pass draft. Nz to review and polish since
// these are brand-facing. Length mismatch is handled by falling back to
// English for any index that has no Arabic counterpart.

import { getLocale } from '@/lib/i18n';

export const QUOTES: string[] = [
  'The privilege of a lifetime is to become who you truly are',
  'I go where I am loved and bring love where I go',
  'The blueprint is believing in yourself',
  'Both fear and faith ask you to believe in something you can’t see',
  'What is done with love, is done well',
  'It’s the thoughts we water each day that become the garden we live in',
  'By believing passionately in something that still does not exist, we create it',
  'The amount of good things in your life depends on your ability to notice them',
  'Be less impressed and more involved',
  'Judge your success not by the harvest you reap but by the seeds you plant',
  'The universe meets you at your level of audacity',
];

export const QUOTES_AR: string[] = [
  'امتياز الحياة أن تصبحي من أنتِ فعلاً',
  'أذهبُ حيث أُحَبّ، وأحمل الحب معي أينما ذهبت',
  'المخطط الأول هو أن تؤمني بنفسكِ',
  'كلاهما، الخوف والإيمان، يطلبان منكِ أن تصدّقي بشيء لا ترينه',
  'ما يُصنع بحب، يُصنع جيداً',
  'الأفكار التي نسقيها كل يوم هي الحديقة التي نعيش فيها',
  'بإيماننا العميق بما لم يوجد بعد، نصنعه',
  'مقدار الخير في حياتكِ يتناسب مع قدرتكِ على ملاحظته',
  'لا تنبهري، بل شاركي',
  'قيّمي نجاحكِ لا بالحصاد الذي تجنينه بل بالبذور التي تزرعينها',
  'الكون يلاقيكِ عند مستوى جرأتكِ',
];

// The same line all day, the next one tomorrow. Returns the Arabic version
// when the app is in Arabic; if the Arabic array is shorter than the English
// one, falls back to the English index so no day comes up blank.
export function quoteOfDay(): string {
  if (!QUOTES.length) return '';
  const day = Math.floor(Date.now() / 86400000);
  const isAr = getLocale() === 'ar';
  if (isAr) {
    const i = day % Math.max(QUOTES_AR.length, 1);
    return QUOTES_AR[i] ?? QUOTES[day % QUOTES.length];
  }
  return QUOTES[day % QUOTES.length];
}
