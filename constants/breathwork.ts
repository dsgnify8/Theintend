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
  cover: any;
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
    cover: require('../assets/images/breathwork/calm-nervous-system.png'),
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
    cover: require('../assets/images/breathwork/box-breathing.png'),
    description:
      'A steady four-count box pattern to find calm focus and quiet the mind before anything demanding.',
    pattern: [
      { label: 'Breathe in', secs: 4, target: 1 },
      { label: 'Hold', secs: 4, target: 1 },
      { label: 'Breathe out', secs: 4, target: 0.55 },
      { label: 'Hold', secs: 4, target: 0.55 },
    ],
  },
  {
    id: 'quick-calm',
    title: '4-7-8 Unwind',
    subtitle: 'A quick reset to calm down',
    duration: '3 min',
    minutes: 3,
    color: '#7E6A82',
    cover: require('../assets/images/breathwork/quick-calm.png'),
    description:
      'A short 4-7-8 pattern, inhale for four, hold for seven, and a long exhale for eight, to quickly downshift an anxious or overstimulated moment.',
    pattern: [
      { label: 'Breathe in', secs: 4, target: 1 },
      { label: 'Hold', secs: 7, target: 1 },
      { label: 'Breathe out', secs: 8, target: 0.5 },
    ],
  },
  {
    id: 'sharpen-focus',
    title: 'Sharpen Focus',
    subtitle: 'Even breathing to center attention',
    duration: '5 min',
    minutes: 5,
    color: '#5C4632',
    cover: require('../assets/images/breathwork/sharpen-focus.png'),
    description:
      'A balanced five-count in and out that steadies the mind and brings clear, calm focus before something that needs your full attention.',
    pattern: [
      { label: 'Breathe in', secs: 5, target: 1 },
      { label: 'Breathe out', secs: 5, target: 0.55 },
    ],
  },
];
