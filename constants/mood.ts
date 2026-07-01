// The mood scale: five levels from low to bright, each with a face and a set
// of keyword chips. Tapping a keyword logs it; the keyword's level drives the
// gentle note. Safe to edit the keywords and the recommendation mapping.

export type MoodKey = 'heavy' | 'stressed' | 'numb' | 'calm' | 'happy';

export type Mood = { key: MoodKey; label: string; color: string; keywords: string[] };

// Order = left (most down) to right (brightest) on the face scale.
export const MOODS: Mood[] = [
  { key: 'heavy',    label: 'Heavy',    color: '#5C6B73', keywords: ['Heavy', 'Drained', 'Low'] },
  { key: 'stressed', label: 'Stressed', color: '#9E6F58', keywords: ['Stressed', 'Anxious', 'Overwhelmed'] },
  { key: 'numb',     label: 'Numb',     color: '#8C8278', keywords: ['Numb', 'Moody', 'Flat'] },
  { key: 'calm',     label: 'Calm',     color: '#6F7A6B', keywords: ['Calm', 'Content', 'Grounded'] },
  { key: 'happy',    label: 'Happy',    color: '#C9A35B', keywords: ['Happy', 'Inspired', 'Energized'] },
];

// Which level a saved keyword belongs to (for recommendations).
export function levelForKeyword(kw: string): MoodKey {
  const low = (kw || '').toLowerCase();
  for (const m of MOODS) {
    if (m.key === low) return m.key;
    if (m.keywords.some((k) => k.toLowerCase() === low)) return m.key;
  }
  return 'numb';
}

export type MoodReco = {
  note: string;
  expertId: string;
  soundId: string;
  articleCategories: string[];
  articleKeywords: string[];
};

// Edit freely. Expert ids and sound ids must match your real content.
export const MOOD_RECO: Record<MoodKey, MoodReco> = {
  calm: {
    note: 'calm',
    expertId: 'irina-goldenberg',
    soundId: 'nervous-system-calm',
    articleCategories: ['Healing', 'Mental Health'],
    articleKeywords: ['calm', 'peace', 'ground', 'rest', 'ease', 'stillness', 'presence'],
  },
  happy: {
    note: 'happy',
    expertId: 'alevtina-buzynarska',
    soundId: 'morning-clarity',
    articleCategories: ['Mental Health', 'Healing'],
    articleKeywords: ['joy', 'gratitude', 'energy', 'vitality', 'momentum', 'bright', 'alive', 'inspired'],
  },
  stressed: {
    note: 'stressed',
    expertId: 'omar-chtioui',
    soundId: 'steady-breath',
    articleCategories: ['Breathwork', 'Mental Health', 'Healing'],
    articleKeywords: ['stress', 'stressed', 'overwhelm', 'tense', 'anxious', 'anxiety', 'pressure', 'worry', 'burnout'],
  },
  heavy: {
    note: 'heavy',
    expertId: 'zahra-gozal',
    soundId: 'ease-anxiety',
    articleCategories: ['Mental Health', 'Healing'],
    articleKeywords: ['heavy', 'grief', 'low', 'weight', 'down', 'burnout', 'tired', 'drained', 'overwhelm'],
  },
  numb: {
    note: 'numb',
    expertId: 'ekaterina-murray',
    soundId: 'clear-mind',
    articleCategories: ['Healing', 'Mental Health'],
    articleKeywords: ['numb', 'disconnect', 'reconnect', 'feeling', 'body', 'shutdown', 'freeze', 'moody', 'flat'],
  },
};

