// The Intend — Library shelves (E-books, Books, Audiobooks).
// Sample, on-brand titles tied to your experts so the shelves are real now.
// Replace with your real catalogue, or sync from your store later.

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
};

export const LIBRARY: LibraryItem[] = [
  { id: 'abundance-kitchen', title: 'Abundance in the Kitchen', author: 'The Intend', type: 'E-book', color: '#9A7B4F', length: 'Guided e-book', description: 'A warm, beautifully designed guide to bringing abundance, nourishment and intention into the heart of your home \u2014 the kitchen.', html: require('../assets/ebooks/abundance-kitchen.html'), cover: require('../assets/ebooks/covers/cover-abundance.jpg') },
  { id: '21-days-jung', title: '21 Days of Transformation', author: 'With the Teachings of Carl Jung', type: 'E-book', color: '#5C4632', length: '21-day journey', description: 'A three-week guided journey through the core teachings of Carl Jung \u2014 shadow work, individuation, dreams, and the path toward wholeness.', pdf: require('../assets/ebooks/21-days-jung.pdf'), cover: require('../assets/ebooks/covers/cover-jung.jpg') },
  { id: 'roots-and-regulation', title: 'Roots & Regulation', author: 'Omar Chtioui', type: 'E-book', color: '#6F7A6B', length: '64 pages', description: 'A short, practical guide to working with the breath and nervous system when the body will not settle.' },
  { id: 'letters-softer-self', title: 'Letters to a Softer Self', author: 'Mara Idris', type: 'E-book', color: '#8A6A58', length: '48 pages', description: 'Gentle reflections for anyone learning to meet themselves with less pressure and more kindness.' },
  { id: 'quiet-nervous-system', title: 'The Quiet Nervous System', author: 'Irina Goldenberg', type: 'E-book', color: '#5C4632', length: '80 pages', description: 'How chronic tension lives in the body, and the somatic practices that bring it back to calm.' },
  { id: 'home-in-the-body', title: 'Home in the Body', author: 'Zahra Gozal', type: 'Book', color: '#7E6A82', length: '210 pages', description: 'A deeper journey into emotional bodywork, identity, and rebuilding self-trust from the inside out.' },
  { id: 'money-and-meaning', title: 'Money & Meaning', author: 'Scheherazade Hasan', type: 'Book', color: '#9A8267', length: '180 pages', description: 'A calmer relationship with money, built on values rather than shame, overwhelm or rigid rules.' },
  { id: 'identity-in-transition', title: 'Identity in Transition', author: 'Ekaterina Murray', type: 'Book', color: '#5C6B73', length: '240 pages', description: 'A neuropsychological look at who we become during major life transitions, and how to stay grounded.' },
  { id: 'breathe-with-me', title: 'Breathe With Me', author: 'Irina Goldenberg', type: 'Audiobook', color: '#6F7A6B', length: '2h 40m', description: 'A guided audio practice of breathwork and somatic movement to release tension and restore calm.' },
  { id: 'evening-calm', title: 'Evening Calm', author: 'The Intend', type: 'Audiobook', color: '#5A5B7A', length: '1h 15m', description: 'Soft spoken sessions to help you wind down, slow the mind, and prepare the body for rest.' },
  { id: 'returning-feminine-energy', title: 'Returning to Feminine Energy', author: 'Alevtina Buzynarska', type: 'Audiobook', color: '#7E6A82', length: '3h 05m', description: 'An audio companion for reconnecting with feeling, pleasure and feminine energy.' },
];
