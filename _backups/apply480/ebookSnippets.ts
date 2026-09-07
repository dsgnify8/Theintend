// Hand-picked passages from the e-books, shown one at a time on the homepage
// and rotating by the day. Keep these short. Anything past about 140 characters
// starts to crowd the card.

export type EbookSnippet = {
  bookId: string;
  passage: string;
  cta: string;
};

export const EBOOK_SNIPPETS: EbookSnippet[] = [
  {
    bookId: 'hormones',
    passage: 'Stress can silence a cycle, and a thyroid problem can cause infertility. They share the same hypothalamus.',
    cta: 'Learn about your hormones',
  },
  {
    bookId: 'hormones',
    passage: 'Hormones run on feedback loops, the way a thermostat does.',
    cta: 'Learn about your hormones',
  },
  {
    bookId: 'hormones',
    passage: 'PCOS is the most common endocrine condition in women of reproductive age, and one of the most misunderstood.',
    cta: 'Learn about your hormones',
  },
  {
    bookId: 'longevity',
    passage: 'Most of us grew up with a quiet, unspoken belief: that aging is something that happens to you.',
    cta: 'Learn about living well for longer',
  },
  {
    bookId: 'longevity',
    passage: 'Healthspan is the number of years you spend genuinely well.',
    cta: 'Learn about living well for longer',
  },
  {
    bookId: 'longevity',
    passage: 'A walk after eating changes how your body handles blood sugar.',
    cta: 'Learn about living well for longer',
  },
  {
    bookId: 'longevity',
    passage: 'The way you sleep, eat, move, think, and care for yourself does a remarkable amount of the editing.',
    cta: 'Learn about living well for longer',
  },
];

// Same passage all day, a different one tomorrow.
export function snippetOfDay(): EbookSnippet {
  const day = Math.floor(Date.now() / 86400000);
  return EBOOK_SNIPPETS[day % EBOOK_SNIPPETS.length];
}
