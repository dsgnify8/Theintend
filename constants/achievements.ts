// The Intend — achievement badges. Sample set for now; unlocking becomes real
// once we track your activity through your account.

export type Achievement = {
  id: string;
  title: string;
  icon: string;
  unlocked: boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-read', title: 'First read', icon: 'book', unlocked: true },
  { id: 'first-session', title: 'First session', icon: 'calendar', unlocked: true },
  { id: 'streak-7', title: '7-day streak', icon: 'flame', unlocked: false },
  { id: 'deep-listener', title: 'Deep listener', icon: 'headset', unlocked: false },
  { id: 'night-owl', title: 'Night owl', icon: 'moon', unlocked: false },
  { id: 'self-worth', title: 'Self-worth', icon: 'heart', unlocked: false },
];
