// The Intend — Sessions data (Classes and Programs).
// Sample content; categories, durations and prices are placeholders to set later.

export type SessionClass = {
  id: string;
  title: string;
  expertId: string;
  expertName: string;
  expertTitle: string;
  category: string;
  durationHours: number;
  date: string;
  time: string;
  going: number;
  link?: string;
  color: string;
  description: string;
};

export type Program = {
  id: string;
  title: string;
  expertId: string;
  expertName: string;
  category: string;
  weeks: number;
  sessions: number;
  cadence: string;
  price: string;
  requiresForm: boolean;
  color: string;
  description: string;
};

export const SESSION_CATEGORIES = ['Breathwork', 'Astrology', 'Money', 'Mindset', 'Healing', 'Body', 'Feminine'];

export const CLASSES: SessionClass[] = [
  {
    id: 'breath-nervous-system',
    title: 'Breath & the Nervous System',
    expertId: 'omar-chtioui',
    expertName: 'Omar Chtioui',
    expertTitle: 'Trauma Healing · Breathwork',
    category: 'Breathwork',
    durationHours: 1,
    date: 'Today',
    time: '6:00 PM – 7:00 PM GST',
    going: 312,
    color: '#5C4632',
    description:
      'A live session on using the breath to settle an activated nervous system. Leave with simple practices you can return to whenever the body feels stuck in overdrive.',
  },
  {
    id: 'money-without-stress',
    title: 'Money Without the Stress',
    expertId: 'scheherazade-hasan',
    expertName: 'Scheherazade Hasan',
    expertTitle: 'Wealth Coach',
    category: 'Money',
    durationHours: 1.5,
    date: 'Thu 3 Jul',
    time: '5:00 PM – 6:30 PM GST',
    going: 198,
    color: '#7C6F62',
    description:
      'Understand what really drives your money stress and learn a calmer, clearer way to make financial decisions that fit your life.',
  },
  {
    id: 'reconnect-with-yourself',
    title: 'Reconnecting With Yourself',
    expertId: 'ekaterina-murray',
    expertName: 'Ekaterina Murray',
    expertTitle: 'Neuropsychology & Identity Specialist',
    category: 'Mindset',
    durationHours: 2,
    date: 'Sat 5 Jul',
    time: '4:00 PM – 6:00 PM GST',
    going: 256,
    color: '#6F7A6B',
    description:
      'A grounded session for anyone in a life transition who has lost touch with their sense of self, with practical ways to rebuild inner stability.',
  },
  {
    id: 'coming-home-to-body',
    title: 'Coming Home to the Body',
    expertId: 'alevtina-buzynarska',
    expertName: 'Alevtina Buzynarska',
    expertTitle: 'Feminine Embodiment Coach',
    category: 'Body',
    durationHours: 1,
    date: 'Mon 7 Jul',
    time: '7:00 PM – 8:00 PM GST',
    going: 174,
    color: '#8A6A58',
    description:
      'A gentle live practice for women who feel disconnected within, guiding the body back to sensation, rest and feeling.',
  },
];

export const PROGRAMS: Program[] = [
  {
    id: 'nervous-system-reset',
    title: 'Nervous System Reset',
    expertId: 'irina-goldenberg',
    expertName: 'Irina Goldenberg',
    category: 'Healing',
    weeks: 4,
    sessions: 4,
    cadence: 'Weekly, 60 min live',
    price: 'AED 1,200',
    requiresForm: false,
    color: '#6F7A6B',
    description:
      'A four week journey to release stored tension, restore proper breathing, and bring the nervous system back to a regulated baseline.',
  },
  {
    id: 'building-self-worth',
    title: 'Building Self-Worth',
    expertId: 'zahra-gozal',
    expertName: 'Zahra Gozal',
    category: 'Mindset',
    weeks: 6,
    sessions: 6,
    cadence: 'Weekly, 60 min live',
    price: 'AED 1,800',
    requiresForm: true,
    color: '#8A6A58',
    description:
      'A six week program working with the body, not just the mind, to rebuild inner structure and self-trust.',
  },
  {
    id: 'feminine-embodiment',
    title: 'Feminine Embodiment',
    expertId: 'alevtina-buzynarska',
    expertName: 'Alevtina Buzynarska',
    category: 'Feminine',
    weeks: 8,
    sessions: 8,
    cadence: 'Weekly, 75 min live',
    price: 'AED 2,400',
    requiresForm: true,
    color: '#7E6A82',
    description:
      'An eight week container using somatic and energy-based practice to shift the patterns that keep women feeling flat or disconnected.',
  },
];
