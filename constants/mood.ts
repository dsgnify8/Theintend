// The mood scale and how each mood maps to a recommendation.
// Everything here is safe to edit in plain language.

export type MoodKey = 'heavy' | 'stressed' | 'numb' | 'calm' | 'happy';

export type Mood = { key: MoodKey; label: string; color: string };

// Order = left to right on the scale (dragging right = feeling lighter).
export const MOODS: Mood[] = [
  { key: 'heavy',    label: 'Heavy',    color: '#5C6B73' },
  { key: 'stressed', label: 'Stressed', color: '#9E6F58' },
  { key: 'numb',     label: 'Numb',     color: '#8C8278' },
  { key: 'calm',     label: 'Calm',     color: '#6F7A6B' },
  { key: 'happy',    label: 'Happy',    color: '#C9A35B' },
];

export type MoodReco = {
  note: string;
  expertId: string;
  soundId: string;
  articleCategories: string[];
  articleKeywords: string[];
};

// Edit these freely. Expert ids and sound ids must match your real content.
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
    articleKeywords: ['joy', 'gratitude', 'energy', 'vitality', 'momentum', 'bright', 'alive'],
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
    articleKeywords: ['heavy', 'grief', 'low', 'weight', 'down', 'burnout', 'tired', 'overwhelm'],
  },
  numb: {
    note: 'numb',
    expertId: 'ekaterina-murray',
    soundId: 'clear-mind',
    articleCategories: ['Healing', 'Mental Health'],
    articleKeywords: ['numb', 'disconnect', 'reconnect', 'feeling', 'body', 'shutdown', 'freeze', 'present'],
  },
};

