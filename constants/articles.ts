// The Intend — Article type plus a small offline fallback.
// Live articles (with their Wix formatting) are pulled in lib/articles.ts.

export type Run = { text: string; bold?: boolean; italic?: boolean };
export type Block = { type: 'h' | 'p'; runs: Run[] };

export type Article = {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  image?: string | null;
  author?: string;
  readMinutes: number;
  body: Block[];
};

export const FALLBACK_ARTICLES: Article[] = [
  {
    id: 'fallback-space',
    title: 'Space Comes First',
    category: 'Wellbeing',
    excerpt: 'A different way to think about waiting and what really brings us closer to what we want.',
    image: null,
    readMinutes: 4,
    body: [
      { type: 'p', runs: [{ text: 'We tend to treat time as the price of getting what we want. But presence, not the passing of time, may be the thing that actually moves us closer.' }] },
      { type: 'p', runs: [{ text: 'This is a sample shown only when the live connection to your blog is unavailable.' }] },
    ],
  },
];
