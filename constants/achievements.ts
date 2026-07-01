// The Intend - achievement badges. Unlocking is computed live from your
// on-device activity (reads, journaling, worksheets, streak, sessions).
export type AchievementMetric = 'reads' | 'journals' | 'worksheets' | 'streak' | 'sessions' | 'listens';
export type Achievement = {
  id: string;
  title: string;
  icon: string;
  req?: { metric: AchievementMetric; count: number };
  unlocked?: boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-read', title: 'First read', icon: 'book', req: { metric: 'reads', count: 1 } },
  { id: 'first-journal', title: 'First journal', icon: 'create', req: { metric: 'journals', count: 1 } },
  { id: 'journal-7', title: 'Seven pages', icon: 'journal', req: { metric: 'journals', count: 7 } },
  { id: 'reflective', title: 'Reflective soul', icon: 'moon', req: { metric: 'journals', count: 21 } },
  { id: 'streak-7', title: '7-day streak', icon: 'flame', req: { metric: 'streak', count: 7 } },
  { id: 'first-worksheet', title: 'First worksheet', icon: 'clipboard', req: { metric: 'worksheets', count: 1 } },
  { id: 'first-session', title: 'First session', icon: 'calendar', req: { metric: 'sessions', count: 1 } },
  { id: 'deep-listener', title: 'Deep listener', icon: 'headset', req: { metric: 'listens', count: 5 } },
];
