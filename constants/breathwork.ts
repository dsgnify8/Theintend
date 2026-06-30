// The Intend — Breathwork (demo). Replace the patterns / copy with the real
// class flow when ready. `target` is the circle scale at the end of each phase.

export type BreathPhase = { label: string; secs: number; target: number };
export type BreathProgram = {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  minutes: number;
  color: string;
  description: string;
  pattern: BreathPhase[];
};

export const BREATH_PROGRAMS: BreathProgram[] = [
  {
    id: 'calm-nervous-system',
    title: 'Calm the Nervous System',
    subtitle: 'Longer exhale to settle',
    duration: '10 min',
    minutes: 10,
    color: '#6F7A6B',
    description:
      'A slow, guided practice with a longer exhale that gently moves the body out of fight-or-flight and into rest.',
    pattern: [
      { label: 'Breathe in', secs: 4, target: 1 },
      { label: 'Hold', secs: 2, target: 1 },
      { label: 'Breathe out', secs: 6, target: 0.55 },
    ],
  },
  {
    id: 'box-breathing',
    title: 'Box Breathing',
    subtitle: 'An even, square rhythm',
    duration: '10 min',
    minutes: 10,
    color: '#5C6B73',
    description:
      'A steady four-count box pattern to find calm focus and quiet the mind before anything demanding.',
    pattern: [
      { label: 'Breathe in', secs: 4, target: 1 },
      { label: 'Hold', secs: 4, target: 1 },
      { label: 'Breathe out', secs: 4, target: 0.55 },
      { label: 'Hold', secs: 4, target: 0.55 },
    ],
  },
];
