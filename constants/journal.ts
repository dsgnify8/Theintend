export type JournalCategory = {
  id: string;
  title: string;
  subtitle: string;
  prompts: string[];
  rotate?: string[];
  rotateCount?: number;
};

export const MORNING: JournalCategory = {
  id: 'morning',
  title: 'Morning Journaling',
  subtitle: 'Begin the day on your own terms',
  prompts: [
    "What is one thing you are looking forward to today?",
    "How do you want to feel by the end of the day?",
    "What is one intention you can set for the next few hours?",
    "What are you grateful for as you begin today?",
    "What is one small way you can take care of yourself today?",
  ],
  rotateCount: 2,
  rotate: [
    "What would make today feel like a good day?",
    "Who could you show a little kindness to today?",
    "What is one thing you can let go of before the day begins?",
    "Where do you most want to put your attention today?",
    "What is one thing you feel proud of right now?",
    "What would the calmest version of you do today?",
  ],
};

export const NIGHT: JournalCategory = {
  id: 'night',
  title: 'Night Journaling',
  subtitle: 'Set the day down before you sleep',
  prompts: [
    "What is one moment from today you want to remember?",
    "What did today teach you about yourself?",
    "What is something you handled well today?",
    "What is weighing on you that you can release before sleep?",
    "Who or what are you grateful for tonight?",
    "What is one thing you want to do differently tomorrow?",
  ],
  rotateCount: 3,
  rotate: [
    "What drained you today, and what restored you?",
    "What is one thing you can forgive yourself for tonight?",
    "When did you feel most like yourself today?",
    "What small win are you carrying into tomorrow?",
    "What do you need to hear before you sleep?",
    "What are you ready to set down for the night?",
    "What made you smile today, even briefly?",
  ],
};

export const THEMES: JournalCategory[] = [
  {
    id: 'growth',
    title: 'Growth',
    subtitle: 'Stretch into who you are becoming',
    prompts: [
      "What are three habits you want to build this year?",
      "How do you define success in your own words?",
      "What is your biggest dream, and what is stopping you from reaching it?",
      "How do you handle failure, and how could you meet it differently?",
      "What is something new you want to learn this month, and why?",
      "How do you stay motivated when things get hard?",
    ],
  },
  {
    id: 'healing',
    title: 'Healing',
    subtitle: 'Make room for what needs tending',
    prompts: [
      "What emotions have you been avoiding, and why?",
      "What past hurt do you need to forgive yourself for?",
      "What habits drain your energy and well-being?",
      "How do you process difficult emotions?",
      "What is one thing you need to hear right now?",
      "How can you show yourself more kindness?",
      "What does emotional healing mean to you?",
    ],
  },
  {
    id: 'habits',
    title: 'Habits',
    subtitle: 'Build the days you want to live',
    prompts: [
      "What daily or weekly habits could better care for your mental health?",
      "What daily or weekly habits could better care for your physical health?",
      "What daily or weekly habits could better care for your emotional health?",
      "What daily or weekly habits could better care for your spiritual health?",
      "Which habit is quietly holding you back, and what could replace it?",
    ],
  },
  {
    id: 'future-desires',
    title: 'Future Desires',
    subtitle: 'Name what you truly want',
    prompts: [
      "If you accomplish only one thing this year, what would make you proud?",
      "If money were not a worry, how would you spend your days?",
      "How would you describe your ideal lifestyle?",
      "If failure were not possible, what would you do for a living?",
      "What does your ideal life look like, and how can you move toward it?",
      "What kind of person do you need to become to create the life you want?",
      "What would you do if you knew you could not fail, and what is one step toward it?",
      "Where do you see yourself in five years if you keep growing the way you are now?",
    ],
  },
  {
    id: 'self-discovery',
    title: 'Self-Discovery',
    subtitle: 'Get to know yourself again',
    prompts: [
      "What makes you unique?",
      "What activities make you lose track of time?",
      "What fears hold you back from your dreams?",
      "How would your ideal daily routine look?",
      "When do you feel most confident?",
      "What past experience shaped you the most?",
      "What advice would your future self give you today?",
      "What limiting beliefs do you need to let go of?",
      "What are three words that describe the person you want to become?",
    ],
  },
  {
    id: 'true-self',
    title: 'Your True Self',
    subtitle: 'Come home to who you really are',
    prompts: [
      "What makes you feel most alive and authentic?",
      "When do you feel most at peace with who you are?",
      "What does your ideal life look like, and how can you align your actions with it?",
      "What are your passions, and how can you nurture them in daily life?",
      "What are your core values, and how do they guide your decisions?",
      "What beliefs about yourself do you want to let go of, and why?",
      "How do you define success for yourself, beyond outside expectations?",
      "What does self-love look like for you, and how can you practice it daily?",
      "What are you afraid to express, and what would happen if you allowed yourself to?",
      "How do you feel when you are being true to yourself?",
      "What strengths do you admire in others that also live in you?",
      "What do you need to forgive yourself for in order to step into your true self?",
    ],
  },
  {
    id: 'romanticizing-life',
    title: 'Romanticizing Life',
    subtitle: 'Find the beauty already here',
    prompts: [
      "What moments make you feel alive?",
      "How can you create more beauty in your daily routine?",
      "What simple things bring you joy?",
      "What would your dream day look like?",
      "How can you slow down more intentionally?",
      "What places inspire you?",
      "What habits make life feel softer?",
      "How can you make ordinary moments special?",
      "What sensory experiences calm you?",
      "What version of yourself do you want to embody?",
      "What routines make you feel grounded?",
      "How can you practice gratitude daily?",
      "What does a peaceful life mean to you?",
      "What activities reconnect you with yourself?",
      "How can you add more intention to your life?",
    ],
  },
  {
    id: 'glow-up-era',
    title: 'Design Your Glow Up Era',
    subtitle: 'Imagine her in full detail',
    prompts: [
      "What does the best version of you look and feel like?",
      "How does she dress to reflect her energy?",
      "What is her morning routine like?",
      "How does she speak to herself internally?",
      "What habits does she live by daily?",
      "What boundaries does she protect?",
      "What kind of people surround her?",
      "How does she spend her evenings?",
      "What is her signature vibe or energy?",
      "How does she take care of her body?",
      "How does she take care of her mind?",
      "What brings her joy, small and big?",
      "What does her ideal weekend look like?",
      "What media does she consume, and why?",
      "What does she say no to?",
      "How does she move through challenges?",
      "What goals excite her most right now?",
      "What does she no longer chase?",
      "How does she romanticize her life?",
      "What is her mantra for this new era?",
    ],
  },
];

export const ALL_CATEGORIES: JournalCategory[] = [MORNING, NIGHT, ...THEMES];

export function getCategory(id: string): JournalCategory | null {
  return ALL_CATEGORIES.find((c) => c.id === id) ?? null;
}

// Morning and night rotate a few of their prompts on a two-day cycle, so the
// page shifts every other day without changing completely. Other categories
// return their fixed prompts. Saved entries keep their own prompt text.
export function promptsForToday(cat: JournalCategory): string[] {
  const rotate = cat.rotate ?? [];
  const count = cat.rotateCount ?? 0;
  if (rotate.length === 0 || count === 0) return cat.prompts;
  const cycle = Math.floor(Date.now() / 86400000 / 2);
  const out = [...cat.prompts];
  for (let k = 0; k < count && k < out.length; k++) {
    const slot = out.length - 1 - k;
    out[slot] = rotate[(cycle + k) % rotate.length];
  }
  return out;
}

export const CHALLENGE_TITLE = '30 Days Writing Challenge';

export const CHALLENGE_PROMPTS: string[] = [
  "What parts of yourself do you try to hide from others, and why?",
  "When do you feel most insecure, and what might that reflect about how you see yourself?",
  "What emotions are you most uncomfortable expressing, and why?",
  "What triggers you in others, and how might that relate to something within you?",
  "What do you secretly judge in people, and why?",
  "What core messages did you receive growing up about emotions, success, or love?",
  "When was the first time you felt rejected or abandoned, and how did you cope?",
  "What did you need most as a child that you did not receive?",
  "What memories still make you feel ashamed or small?",
  "What parts of your personality do you tone down to be accepted or praised?",
  "What are you afraid people would think if they really knew you?",
  "Where in your life are you pretending or performing?",
  "What parts of your identity feel inauthentic or forced?",
  "What are you ashamed of that you have never fully acknowledged?",
  "In what ways do you betray yourself to make others comfortable?",
  "How do you tend to show up in relationships? Do you overgive, withdraw, or seek validation?",
  "What patterns keep repeating in your relationships?",
  "What boundaries do you struggle to maintain, and why?",
  "Is there anyone in your life you still feel some resentment toward?",
  "What do you expect from others that you do not give to yourself?",
  "What situations make you feel out of control, and how do you usually react?",
  "When have you shaped a situation to get what you wanted?",
  "What qualities do you admire or envy in others, and how might they live in you too?",
  "Where are you giving away your power out of fear or habit?",
  "What stories do you tell yourself that keep you small or safe?",
  "What part of yourself are you ready to reclaim and bring into the light?",
  "What would it feel like to fully accept every part of you?",
  "What would change if you stopped seeking approval and trusted your own voice?",
  "Which version of you are you ready to release, and who are you becoming?",
  "What truth about yourself are you finally ready to accept with compassion?",
];
