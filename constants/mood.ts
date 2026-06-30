// The mood scale and how each mood maps to a recommendation.
// Everything here is safe to edit in plain language.

export type MoodKey = 'heavy' | 'lost' | 'numb' | 'calm' | 'happy';

export type Mood = { key: MoodKey; label: string; color: string };

// Order = left to right on the scale (dragging right = feeling lighter).
export const MOODS: Mood[] = [
  { key: 'heavy', label: 'Heavy', color: '#5C6B73' },
  { key: 'lost',  label: 'Lost',  color: '#7E6A82' },
  { key: 'numb',  label: 'Numb',  color: '#8C8278' },
  { key: 'calm',  label: 'Calm',  color: '#6F7A6B' },
  { key: 'happy', label: 'Happy', color: '#C9A35B' },
];

export type MoodReco = {
  note: string;            // fills "We've noticed you've been feeling ___ lately."
  expertId: string;        // who we suggest
  soundId: string;         // which sound we suggest
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
  lost: {
    note: 'lost',
    expertId: 'ekaterina-murray',
    soundId: 'clear-mind',
    articleCategories: ['Mental Health', 'Healing'],
    articleKeywords: ['lost', 'freeze', 'stuck', 'direction', 'purpose', 'identity', 'meaning', 'clarity'],
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
    expertId: 'omar-chtioui',
    soundId: 'steady-breath',
    articleCategories: ['Healing', 'Breathwork', 'Mental Health'],
    articleKeywords: ['numb', 'disconnect', 'reconnect', 'feeling', 'body', 'shutdown', 'freeze', 'present'],
  },
};

