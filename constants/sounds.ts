// The Intend Sounds and Frequencies (real, uploaded tracks only).

export type Sound = {
  id: string;
  title: string;
  purpose: string;
  category: string; // Focus | Calm | Sleep | Energy
  duration: string;
  color: string;
  url?: string;
};

export const SOUND_CATEGORIES = ['All', 'Focus'];

export const SOUNDS: Sound[] = [
  { id: 'quantum-focus', title: 'Quantum Focus', purpose: '13 Hz for focus, concentration and memory', category: 'Focus', duration: '90 min', color: '#5C4632', url: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/sounds/quantum-focus.mp3' },
  { id: '432hz-energizer', title: '432 Hz Mental Energizer', purpose: 'Calms your nervous system, sharpens focus and clears mental clutter', category: 'Focus', duration: '', color: '#6F7A6B', url: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/sounds/432hz-energizer.mp3' },
];
