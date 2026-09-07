// Hand-picked passages from the e-books, shown one at a time on the homepage
// and rotating by the day. Keep these short. Anything past about 140 characters
// starts to crowd the card.
//
// Arabic passages are Claude's first-pass drafts. Nz to review and polish,
// since these are brand-facing content. Empty arPassage or arCta falls back
// to the English version so nothing on the card ever goes blank.

import { getLocale } from '@/lib/i18n';

export type EbookSnippet = {
  bookId: string;
  passage: string;
  cta: string;
  arPassage?: string;
  arCta?: string;
};

export const EBOOK_SNIPPETS: EbookSnippet[] = [
  {
    bookId: 'hormones',
    passage: 'Stress can silence a cycle, and a thyroid problem can cause infertility. They share the same hypothalamus.',
    cta: 'Learn about your hormones',
    arPassage: 'التوتر قد يوقف الدورة، ومشكلة في الغدة الدرقية قد تسبب العقم. كلاهما ينطلق من نفس الوطاء.',
    arCta: 'تعرّفي على هرموناتكِ',
  },
  {
    bookId: 'hormones',
    passage: 'Hormones run on feedback loops, the way a thermostat does.',
    cta: 'Learn about your hormones',
    arPassage: 'الهرمونات تعمل بحلقات تغذية راجعة، تماماً كما يعمل منظم الحرارة.',
    arCta: 'تعرّفي على هرموناتكِ',
  },
  {
    bookId: 'hormones',
    passage: 'PCOS is the most common endocrine condition in women of reproductive age, and one of the most misunderstood.',
    cta: 'Learn about your hormones',
    arPassage: 'تكيّس المبايض من أكثر اضطرابات الغدد شيوعاً عند النساء في سن الإنجاب، ومن أكثرها سوء فهم.',
    arCta: 'تعرّفي على هرموناتكِ',
  },
  {
    bookId: 'longevity',
    passage: 'Most of us grew up with a quiet, unspoken belief: that aging is something that happens to you.',
    cta: 'Learn about living well for longer',
    arPassage: 'معظمنا نشأنا مع اعتقاد صامت: أن الشيخوخة شيء يحدث لكِ.',
    arCta: 'تعرّفي على العيش الأطول والأصح',
  },
  {
    bookId: 'longevity',
    passage: 'Healthspan is the number of years you spend genuinely well.',
    cta: 'Learn about living well for longer',
    arPassage: 'عمر الصحة هو عدد السنوات التي تعيشينها بصحة حقيقية.',
    arCta: 'تعرّفي على العيش الأطول والأصح',
  },
  {
    bookId: 'longevity',
    passage: 'A walk after eating changes how your body handles blood sugar.',
    cta: 'Learn about living well for longer',
    arPassage: 'المشي بعد الأكل يغيّر كيف يتعامل جسدكِ مع سكر الدم.',
    arCta: 'تعرّفي على العيش الأطول والأصح',
  },
  {
    bookId: 'longevity',
    passage: 'The way you sleep, eat, move, think, and care for yourself does a remarkable amount of the editing.',
    cta: 'Learn about living well for longer',
    arPassage: 'طريقة نومكِ وأكلكِ وحركتكِ وتفكيركِ واعتنائكِ بنفسكِ تشكّل الجزء الأكبر من المعادلة.',
    arCta: 'تعرّفي على العيش الأطول والأصح',
  },
];

// Same passage all day, a different one tomorrow. Returns the Arabic version
// when the app is in Arabic and one exists; falls back to English otherwise.
export function snippetOfDay(): { bookId: string; passage: string; cta: string } {
  const day = Math.floor(Date.now() / 86400000);
  const s = EBOOK_SNIPPETS[day % EBOOK_SNIPPETS.length];
  const isAr = getLocale() === 'ar';
  return {
    bookId: s.bookId,
    passage: isAr && s.arPassage ? s.arPassage : s.passage,
    cta: isAr && s.arCta ? s.arCta : s.cta,
  };
}
