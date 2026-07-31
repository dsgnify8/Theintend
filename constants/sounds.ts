// The Intend Sounds and Frequencies (real, uploaded tracks only).

export type Sound = {
  id: string;
  title: string;
  purpose: string;
  category: string; // Focus | Calm | Sleep | Energy
  duration: string;
  color: string;
  url?: string;
  // Bundled artwork. An admin upload under the key sound:<id> wins over it.
  cover?: any;
};

export const SOUND_CATEGORIES = ['All', 'Focus', 'Calm'];

export const SOUNDS: Sound[] = [
  { id: 'nervous-system-999', title: 'Nervous System Regulation', purpose: '999 Hz handpan for settling an activated nervous system', category: 'Calm', duration: '60 min', color: '#6E7B85', url: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/sounds/nervous-system-999.mp3', cover: require('../assets/images/nervous-system-999-cover.jpg') },
  { id: 'quantum-focus', title: 'Quantum Focus', purpose: '13 Hz for focus, concentration and memory', category: 'Focus', duration: '90 min', color: '#5C4632', url: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/sounds/quantum-focus.mp3', cover: require('../assets/images/quantum-focus-cover.jpg') },
  { id: '432hz-energizer', title: '432 Hz Mental Energizer', purpose: 'Calms your nervous system, sharpens focus and clears mental clutter', category: 'Focus', duration: '90 min', color: '#6F7A6B', url: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/sounds/432hz-energizer.mp3', cover: require('../assets/images/432hz-cover.jpg') },
];
