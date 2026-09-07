// The Intend, Library shelves (E-books, Books, Audiobooks).
// Sample, on-brand titles tied to your experts so the shelves are real now.
// Replace with your real catalogue, or sync from your store later.
//
// Arabic fields (arTitle, arAuthor, arDescription) are Claude's first-pass
// drafts. Nz to review and polish since these are brand-facing. Any empty
// ar field falls back to the English one so nothing on a shelf goes blank.

import { getLocale } from '@/lib/i18n';

export type LibraryItem = {
  id: string;
  title: string;
  author: string;
  type: 'E-book' | 'Book' | 'Audiobook';
  color: string;
  length: string;
  description: string;
  pdf?: any;
  html?: any;
  cover?: string;
  // Optional Arabic versions of the reader-facing text fields.
  arTitle?: string;
  arAuthor?: string;
  arDescription?: string;
  arLength?: string;
};

export const LIBRARY: LibraryItem[] = [
  {
    id: 'quiet-engine', title: 'The World of Gut Health', author: 'The Intend',
    type: 'E-book', color: '#6F7A6B', length: 'Guided e-book',
    description: 'What gut health actually means, which tests are worth doing, and how the gut connects to mood, skin, hormones and immunity.',
    html: require('../assets/ebooks/quiet-engine.html'), cover: require('../assets/ebooks/covers/cover-quiet-engine.jpg'),
    arTitle: 'عالم صحة الأمعاء',
    arAuthor: 'ذا إنتِند',
    arDescription: 'ماذا تعني صحة الأمعاء فعلاً، أي الفحوص تستحق الإجراء، وكيف ترتبط الأمعاء بالمزاج والبشرة والهرمونات والمناعة.',
    arLength: 'كتاب إلكتروني مرشد',
  },
  {
    id: 'hormones', title: 'A Guide to Hormonal Health', author: 'The Intend',
    type: 'E-book', color: '#A47B6B', length: 'Guided e-book',
    description: 'How the hormonal system actually works, what shifts it, and how to read your own cycle with more confidence.',
    html: require('../assets/ebooks/hormones.html'), cover: require('../assets/ebooks/covers/cover-hormones.jpg'),
    arTitle: 'دليل الصحة الهرمونية',
    arAuthor: 'ذا إنتِند',
    arDescription: 'كيف يعمل النظام الهرموني فعلاً، وما الذي يحرّكه، وكيف تقرئين دورتكِ بثقة أكبر.',
    arLength: 'كتاب إلكتروني مرشد',
  },
  {
    id: 'longevity', title: 'Living Better and Longer', author: 'The Intend',
    type: 'E-book', color: '#8A7C63', length: 'Guided e-book',
    description: 'A grounded look at how the body ages, what genuinely slows it down, and the daily choices that carry the most weight.',
    html: require('../assets/ebooks/longevity.html'), cover: require('../assets/ebooks/covers/cover-longevity.jpg'),
    arTitle: 'العيش أفضل وأطول',
    arAuthor: 'ذا إنتِند',
    arDescription: 'نظرة صادقة إلى كيف يشيخ الجسد، وما الذي يبطئ ذلك فعلاً، والاختيارات اليومية الأكثر أثراً.',
    arLength: 'كتاب إلكتروني مرشد',
  },
  {
    id: 'abundance-kitchen', title: 'Abundance in the Kitchen', author: 'The Intend',
    type: 'E-book', color: '#9A7B4F', length: 'Guided e-book',
    description: 'A warm, beautifully designed guide to bringing abundance, nourishment and intention into the heart of your home, the kitchen.',
    html: require('../assets/ebooks/abundance-kitchen.html'), cover: require('../assets/ebooks/covers/cover-abundance.jpg'),
    arTitle: 'وفرة في المطبخ',
    arAuthor: 'ذا إنتِند',
    arDescription: 'دليل دافئ ومصمم بعناية يجلب الوفرة والغذاء والنية إلى قلب البيت، المطبخ.',
    arLength: 'كتاب إلكتروني مرشد',
  },
  {
    id: '21-days-jung', title: '21 Days of Transformation', author: 'With the Teachings of Carl Jung',
    type: 'E-book', color: '#5C4632', length: '21-day journey',
    description: 'A three week guided journey through shadow work, individuation, dreams, and the path toward wholeness.',
    html: require('../assets/ebooks/21-days-jung.html'),
    arTitle: '21 يوماً من التحول',
    arAuthor: 'مع تعاليم كارل يونغ',
    arDescription: 'رحلة مرشدة لثلاثة أسابيع في عمل الظل والفردنة والأحلام والطريق نحو الاكتمال.',
    arLength: 'رحلة 21 يوماً',
  },
  {
    id: 'home-in-the-body', title: 'Home in the Body', author: 'Zahra Gozal',
    type: 'Book', color: '#7E6A82', length: '210 pages',
    description: 'A deeper journey into emotional bodywork, identity, and rebuilding self-trust from the inside out.',
    arTitle: 'الوطن في الجسد',
    arAuthor: 'زهراء غزال',
    arDescription: 'رحلة أعمق في العمل الجسدي العاطفي، الهوية، وإعادة بناء الثقة بالنفس من الداخل.',
    arLength: '210 صفحة',
  },
  {
    id: 'money-and-meaning', title: 'Money & Meaning', author: 'Scheherazade Hasan',
    type: 'Book', color: '#9A8267', length: '180 pages',
    description: 'A calmer relationship with money, built on values rather than shame, overwhelm or rigid rules.',
    arTitle: 'المال والمعنى',
    arAuthor: 'شهرزاد حسن',
    arDescription: 'علاقة أهدأ مع المال، مبنية على القيم لا على الخجل أو الإرهاق أو القواعد الصارمة.',
    arLength: '180 صفحة',
  },
  {
    id: 'identity-in-transition', title: 'Identity in Transition', author: 'Ekaterina Murray',
    type: 'Book', color: '#5C6B73', length: '240 pages',
    description: 'A neuropsychological look at who we become during major life transitions, and how to stay grounded.',
    arTitle: 'الهوية في التحول',
    arAuthor: 'إيكاترينا موراي',
    arDescription: 'نظرة من علم النفس العصبي إلى من نصبح خلال التحولات الكبرى في الحياة، وكيف نبقى ثابتات.',
    arLength: '240 صفحة',
  },
  {
    id: 'breathe-with-me', title: 'Breathe With Me', author: 'Irina Goldenberg',
    type: 'Audiobook', color: '#6F7A6B', length: '2h 40m',
    description: 'A guided audio practice of breathwork and somatic movement to release tension and restore calm.',
    arTitle: 'تنفّسي معي',
    arAuthor: 'إيرينا غولدنبرغ',
    arDescription: 'ممارسة صوتية مرشدة من التنفس والحركة الجسدية لتحرير التوتر واستعادة الهدوء.',
    arLength: 'ساعتان و40 دقيقة',
  },
  {
    id: 'evening-calm', title: 'Evening Calm', author: 'The Intend',
    type: 'Audiobook', color: '#5A5B7A', length: '1h 15m',
    description: 'Soft spoken sessions to help you wind down, slow the mind, and prepare the body for rest.',
    arTitle: 'هدوء المساء',
    arAuthor: 'ذا إنتِند',
    arDescription: 'جلسات بصوت هادئ تساعدكِ على الاسترخاء، وإبطاء الذهن، وتهيئة الجسد للراحة.',
    arLength: 'ساعة و15 دقيقة',
  },
  {
    id: 'returning-feminine-energy', title: 'Returning to Feminine Energy', author: 'Alevtina Buzynarska',
    type: 'Audiobook', color: '#7E6A82', length: '3h 05m',
    description: 'An audio companion for reconnecting with feeling, pleasure and feminine energy.',
    arTitle: 'العودة إلى الطاقة الأنثوية',
    arAuthor: 'أليفتينا بوزيناروسكا',
    arDescription: 'رفيق صوتي للعودة إلى الشعور واللذة والطاقة الأنثوية.',
    arLength: '3 ساعات و5 دقائق',
  },
];

// Localise a library item to the current app locale. Any Arabic field that
// was left blank falls back to the English one so nothing goes empty. Screens
// that render LibraryItem values (shelves, snippet card, cover strips) should
// call this rather than reading .title / .author / .description directly, so
// the app locale is honoured.
export function localizeLibraryItem(item: LibraryItem): LibraryItem {
  if (getLocale() !== 'ar') return item;
  return {
    ...item,
    title: item.arTitle || item.title,
    author: item.arAuthor || item.author,
    description: item.arDescription || item.description,
    length: item.arLength || item.length,
  };
}
