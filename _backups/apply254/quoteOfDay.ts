// Quote of the day for the homepage. A curated list, one line per day, in
// order. Add or replace lines freely: the rotation adjusts to the length.
// These are not affirmations, though the card still links into I Am.

export const QUOTES: string[] = [
  'I can move at my own pace.',
  'What I feel is information, not instruction.',
  'I am allowed to change my mind.',
  'I can begin again at any point in the day.',
  'Rest is part of the work.',
  'I do not have to earn my own care.',
];

// The same line all day, the next one tomorrow.
export function quoteOfDay(): string {
  if (!QUOTES.length) return '';
  const day = Math.floor(Date.now() / 86400000);
  return QUOTES[day % QUOTES.length];
}
