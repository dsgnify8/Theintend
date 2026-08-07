// Quote of the day for the homepage. A curated list, one line per day, in
// order. Add or replace lines freely: the rotation adjusts to the length.
// These are not affirmations, though the card still links into I Am.

export const QUOTES: string[] = [
  'The privilege of a lifetime is to become who you truly are',
  'I go where I am loved and bring love where I go',
  'The blueprint is believing in yourself.',
  'Both fear and faith ask you to believe in something you can’t see',
  'What is done with love, is done well',
  'It’s the thoughts we water each day that become the garden we live in',
  'By believing passionately in something that still does not exist, we create it',
];

// The same line all day, the next one tomorrow.
export function quoteOfDay(): string {
  if (!QUOTES.length) return '';
  const day = Math.floor(Date.now() / 86400000);
  return QUOTES[day % QUOTES.length];
}
