// The Intend — Sounds and Frequencies.
// Sample collection so the page is real now. The actual audio files, background
// playback and offline download are wired in the next step.

export type Sound = {
  id: string;
  title: string;
  purpose: string;
  category: string; // Focus | Calm | Sleep | Energy
  duration: string;
  color: string;
};

export const SOUND_CATEGORIES = ['All', 'Focus', 'Calm', 'Sleep', 'Energy'];

export const SOUNDS: Sound[] = [
  { id: 'deep-focus', title: 'Deep Focus', purpose: 'For uninterrupted concentration', category: 'Focus', duration: '45–480 min', color: '#6F7A6B' },
  { id: 'clear-mind', title: 'Clear Mind', purpose: 'For a calm, sharp head', category: 'Focus', duration: '45–480 min', color: '#5C4632' },
  { id: 'ease-anxiety', title: 'Ease Anxiety', purpose: 'For helping you unwind', category: 'Calm', duration: '20–480 min', color: '#5C6B73' },
  { id: 'nervous-system-calm', title: 'Nervous System Calm', purpose: 'For settling an activated body', category: 'Calm', duration: '20–480 min', color: '#9A8267' },
  { id: 'steady-breath', title: 'Steady Breath', purpose: 'For slow, even breathing', category: 'Calm', duration: '10–60 min', color: '#7C6F62' },
  { id: 'drift-to-sleep', title: 'Drift to Sleep', purpose: 'For a good night of rest', category: 'Sleep', duration: '45–480 min', color: '#5A5B7A' },
  { id: 'evening-wind-down', title: 'Evening Wind-Down', purpose: 'For preparing for bedtime', category: 'Sleep', duration: '20–120 min', color: '#7E6A82' },
  { id: 'morning-clarity', title: 'Morning Clarity', purpose: 'For a good day ahead', category: 'Energy', duration: '15–60 min', color: '#8A6A58' },
];
