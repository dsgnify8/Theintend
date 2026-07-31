// The Intend, brand tokens. Change colours and fonts here once and the whole
// app follows. These match the website's design system.

export const COLORS = {
  bg: '#F7F2EA',
  bgAlt: '#E4E2E3',
  card: '#FFFFFF',
  // Off white, for surfaces where sharp white reads too hard.
  cardMilk: '#FCFAF6',
  ink: '#2B2622',
  muted: '#8C8278',
  line: '#E6E1DA',
  // Text emphasis, hover states, quotation marks and small marks.
  accent: '#5C4632',
  // Solid button fills. The deep brown reads heavy at button size.
  taupe: '#6B6157',
  // Taupe carried toward blue, for marks that sit on the sky images.
  taupeBlue: '#6E7B85',
  // Soft yellow for the worksheets. Ink type on it, not cream.
  pastel: '#E7D5A6',
  accentSoft: '#EDE7DF',
  // Large tinted sections and washes. Sampled from the website.
  wash: '#EBE6DF',
};

// Display type. Every heading in the app already reads this token, so pointing
// it at Playfair moves the whole app at once.
export const FONT_SERIF = 'PlayfairDisplay_500Medium';
export const FONT_SERIF_BOLD = 'PlayfairDisplay_700Bold';

// Body and UI.
export const FONT_SANS = 'Inter_400Regular';
export const FONT_SANS_MEDIUM = 'Inter_500Medium';

// Single emphasised words only, never a whole line.
export const FONT_ITALIC = 'CormorantGaramond_500Medium_Italic';

// The tagline, and nothing else.
export const FONT_SCRIPT = 'PinyonScript_400Regular';

// Small uppercase labels carry wide tracking in Latin. In Arabic and Farsi the
// script is cursive, so tracking pulls the letter joins apart and uppercase
// does nothing at all. Use LABEL_RTL for those, at a larger size, with no
// transform.
export const LABEL_LATIN = { fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' as const };
export const LABEL_RTL = { fontSize: 13, letterSpacing: 0 };

// Temporary stand-in for the signed-in user. Later this comes from your account system.
export const USER = {
  name: 'Nojan',
  email: 'hello@theintend.com',
};
