// The Intend — reading library data.
// A small local list so the Read tab works now. Next we pull the full, live list
// from your Wix CMS. Items open on the web for now; in-app reading comes once we
// connect the article content from Wix.

export type Article = {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  readMinutes: number;
  url: string;
};

export const ARTICLES: Article[] = [
  {
    id: 'ocd-gut-microbiome',
    title: 'Is OCD in the Gut? The Surprising Link Between Microbiome and Mental Health',
    category: 'Mental Health',
    excerpt:
      'New research is reshaping how we think about obsessive thoughts, pointing to the gut as an unexpected player in mental wellbeing.',
    readMinutes: 6,
    url: 'https://www.theintend.com/articles',
  },
  {
    id: 'nervous-system-reset',
    title: 'How to Reset a Nervous System Stuck in Overdrive',
    category: 'Healing',
    excerpt:
      'When the body cannot switch off, rest does not land. A look at the simple practices that bring the nervous system back to baseline.',
    readMinutes: 5,
    url: 'https://www.theintend.com/articles',
  },
  {
    id: 'money-and-the-body',
    title: 'Why Money Stress Lives in the Body, Not Just the Spreadsheet',
    category: 'Wealth',
    excerpt:
      'Financial anxiety is rarely about the numbers alone. Understanding the patterns underneath changes how we decide.',
    readMinutes: 7,
    url: 'https://www.theintend.com/articles',
  },
  {
    id: 'feminine-energy-reconnect',
    title: 'Coming Home to the Body: Reconnecting With Feminine Energy',
    category: 'Women\u2019s Health',
    excerpt:
      'For women who function on the outside but feel flat within, the way back is through sensation, not effort.',
    readMinutes: 5,
    url: 'https://www.theintend.com/articles',
  },
  {
    id: 'breathwork-beginners',
    title: 'Breathwork for Beginners: Where to Actually Start',
    category: 'Breathwork',
    excerpt:
      'A grounded introduction to using the breath to calm the mind and release what the body has been holding.',
    readMinutes: 4,
    url: 'https://www.theintend.com/articles',
  },
];

export const READ_FORMATS = ['Articles', 'E-books', 'Workbooks', 'Books'];
