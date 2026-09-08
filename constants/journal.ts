// Journal categories, prompts, and the 30 day challenge.
//
// Arabic fields (arTitle, arSubtitle, arPrompts, arRotate) are Claude's
// first-pass drafts. Nz to review and polish since these are the daily
// personal-writing prompts users open on the app; brand voice matters
// heavily here. Length of arPrompts must match prompts, and arRotate
// must match rotate, or the localizer falls back to English for that
// category to avoid index mismatches. Same for CHALLENGE_PROMPTS_AR
// vs CHALLENGE_PROMPTS.

import { getLocale } from '@/lib/i18n';

export type JournalCategory = {
  id: string;
  title: string;
  subtitle: string;
  prompts: string[];
  rotate?: string[];
  rotateCount?: number;
  arTitle?: string;
  arSubtitle?: string;
  arPrompts?: string[];
  arRotate?: string[];
};

export const MORNING: JournalCategory = {
  id: 'morning',
  title: 'Morning Journaling',
  subtitle: 'Begin the day on your own terms',
  arTitle: 'التدوين الصباحي',
  arSubtitle: 'ابدئي يومكِ بشروطكِ',
  prompts: [
    "What is one thing you are looking forward to today?",
    "How do you want to feel by the end of the day?",
    "What is one intention you can set for the next few hours?",
    "What are you grateful for as you begin today?",
    "What is one small way you can take care of yourself today?",
  ],
  arPrompts: [
    "ما الشيء الذي تتطلّعين إليه اليوم؟",
    "بأيّ شعور تريدين أن تختمي يومكِ؟",
    "ما النيّة التي يمكنكِ أن تضعيها للساعات القادمة؟",
    "لأيّ شيء تشعرين بالامتنان في بداية يومكِ؟",
    "ما الطريقة الصغيرة التي يمكنكِ أن تعتني بها بنفسكِ اليوم؟",
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
  arRotate: [
    "ما الذي يجعل هذا اليوم يبدو يوماً جميلاً؟",
    "لمن يمكنكِ أن تُظهري القليل من اللطف اليوم؟",
    "ما الذي يمكنكِ أن تتخلّي عنه قبل أن يبدأ اليوم؟",
    "أين تريدين أن تضعي انتباهكِ اليوم أكثر شيء؟",
    "ما الذي تشعرين بالفخر تجاهه الآن؟",
    "ماذا ستفعل النسخة الأكثر هدوءاً منكِ اليوم؟",
  ],
};

export const NIGHT: JournalCategory = {
  id: 'night',
  title: 'Night Journaling',
  subtitle: 'Set the day down before you sleep',
  arTitle: 'التدوين الليلي',
  arSubtitle: 'أنزلي عبء اليوم قبل النوم',
  prompts: [
    "What is one moment from today you want to remember?",
    "What did today teach you about yourself?",
    "What is something you handled well today?",
    "What is weighing on you that you can release before sleep?",
    "Who or what are you grateful for tonight?",
    "What is one thing you want to do differently tomorrow?",
  ],
  arPrompts: [
    "ما اللحظة من هذا اليوم التي تريدين أن تتذكّريها؟",
    "ماذا علّمكِ هذا اليوم عن نفسكِ؟",
    "ما الشيء الذي أحسنتِ التعامل معه اليوم؟",
    "ما الذي يثقلكِ ويمكنكِ أن تتركيه قبل النوم؟",
    "لمن أو لأيّ شيء تشعرين بالامتنان هذه الليلة؟",
    "ما الشيء الذي تريدين أن تفعليه بشكل مختلف غداً؟",
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
  arRotate: [
    "ما الذي استنزفكِ اليوم، وما الذي أعادكِ إلى نفسكِ؟",
    "ما الشيء الذي يمكنكِ أن تسامحي نفسكِ عليه الليلة؟",
    "متى شعرتِ أكثر شيء أنّكِ أنتِ اليوم؟",
    "ما الانتصار الصغير الذي تحملينه معكِ إلى الغد؟",
    "ما الذي تحتاجين أن تسمعيه قبل أن تنامي؟",
    "ما الذي أنتِ مستعدّة أن تتركيه لليل؟",
    "ما الذي جعلكِ تبتسمين اليوم، ولو للحظة؟",
  ],
};

export const THEMES: JournalCategory[] = [
  {
    id: 'growth',
    title: 'Growth',
    subtitle: 'Stretch into who you are becoming',
    arTitle: 'النمو',
    arSubtitle: 'امتدّي نحو من تصبحين',
    prompts: [
      "What are three habits you want to build this year?",
      "How do you define success in your own words?",
      "What is your biggest dream, and what is stopping you from reaching it?",
      "How do you handle failure, and how could you meet it differently?",
      "What is something new you want to learn this month, and why?",
      "How do you stay motivated when things get hard?",
    ],
    arPrompts: [
      "ما ثلاث عادات تريدين أن تبنيها هذه السنة؟",
      "كيف تعرّفين النجاح بكلماتكِ؟",
      "ما أكبر حلم لكِ، وما الذي يمنعكِ من الوصول إليه؟",
      "كيف تتعاملين مع الفشل، وكيف يمكنكِ أن تقابليه بشكل مختلف؟",
      "ما الشيء الجديد الذي تريدين أن تتعلّميه هذا الشهر، ولماذا؟",
      "كيف تحافظين على دافعكِ حين تصعب الأمور؟",
    ],
  },
  {
    id: 'healing',
    title: 'Healing',
    subtitle: 'Make room for what needs tending',
    arTitle: 'الشفاء',
    arSubtitle: 'افسحي مكاناً لما يحتاج إلى رعاية',
    prompts: [
      "What emotions have you been avoiding, and why?",
      "What past hurt do you need to forgive yourself for?",
      "What habits drain your energy and well-being?",
      "How do you process difficult emotions?",
      "What is one thing you need to hear right now?",
      "How can you show yourself more kindness?",
      "What does emotional healing mean to you?",
    ],
    arPrompts: [
      "ما المشاعر التي كنتِ تتجنّبينها، ولماذا؟",
      "لأيّ ألم من الماضي تحتاجين أن تسامحي نفسكِ؟",
      "ما العادات التي تستنزف طاقتكِ وسلامتكِ؟",
      "كيف تعالجين المشاعر الصعبة؟",
      "ما الشيء الذي تحتاجين أن تسمعيه الآن؟",
      "كيف يمكنكِ أن تُظهري لنفسكِ مزيداً من اللطف؟",
      "ماذا يعني لكِ الشفاء العاطفي؟",
    ],
  },
  {
    id: 'habits',
    title: 'Habits',
    subtitle: 'Build the days you want to live',
    arTitle: 'العادات',
    arSubtitle: 'ابني الأيام التي تريدين أن تعيشيها',
    prompts: [
      "What daily or weekly habits could better care for your mental health?",
      "What daily or weekly habits could better care for your physical health?",
      "What daily or weekly habits could better care for your emotional health?",
      "What daily or weekly habits could better care for your spiritual health?",
      "Which habit is quietly holding you back, and what could replace it?",
    ],
    arPrompts: [
      "ما العادات اليومية أو الأسبوعية التي تعتني أكثر بصحّتكِ الذهنية؟",
      "ما العادات اليومية أو الأسبوعية التي تعتني أكثر بصحّتكِ الجسدية؟",
      "ما العادات اليومية أو الأسبوعية التي تعتني أكثر بصحّتكِ العاطفية؟",
      "ما العادات اليومية أو الأسبوعية التي تعتني أكثر بصحّتكِ الروحية؟",
      "أيّ عادة تعطّلكِ بهدوء، وما الذي يمكن أن يحلّ محلّها؟",
    ],
  },
  {
    id: 'future-desires',
    title: 'Future Desires',
    subtitle: 'Name what you truly want',
    arTitle: 'رغبات المستقبل',
    arSubtitle: 'سمّي ما تريدينه حقاً',
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
    arPrompts: [
      "لو أنجزتِ شيئاً واحداً فقط هذه السنة، ما الذي يجعلكِ فخورة؟",
      "لو لم يكن المال قلقاً، كيف كنتِ ستقضين أيامكِ؟",
      "كيف تصفين نمط حياتكِ المثالي؟",
      "لو كان الفشل مستحيلاً، ماذا كنتِ ستعملين؟",
      "كيف تبدو حياتكِ المثالية، وكيف يمكنكِ أن تتقدّمي نحوها؟",
      "ما نوع الشخص الذي تحتاجين أن تصبحيه لتصنعي الحياة التي تريدين؟",
      "ماذا ستفعلين لو عرفتِ أنّكِ لن تفشلي، وما الخطوة الأولى نحو ذلك؟",
      "أين ترين نفسكِ بعد خمس سنوات لو استمررتِ في النموّ كما أنتِ الآن؟",
    ],
  },
  {
    id: 'self-discovery',
    title: 'Self-Discovery',
    subtitle: 'Get to know yourself again',
    arTitle: 'اكتشاف الذات',
    arSubtitle: 'تعرّفي على نفسكِ من جديد',
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
    arPrompts: [
      "ما الذي يجعلكِ فريدة؟",
      "ما النشاطات التي تُنسيكِ الوقت؟",
      "ما المخاوف التي تعيقكِ عن أحلامكِ؟",
      "كيف يبدو روتينكِ اليومي المثالي؟",
      "متى تشعرين بالثقة أكثر شيء؟",
      "أيّ تجربة من الماضي شكّلتكِ أكثر شيء؟",
      "ما النصيحة التي ستقدّمها نسختكِ المستقبلية لكِ اليوم؟",
      "ما المعتقدات المُقيِّدة التي تحتاجين أن تتخلّي عنها؟",
      "ما الكلمات الثلاث التي تصف الشخص الذي تريدين أن تصبحيه؟",
    ],
  },
  {
    id: 'true-self',
    title: 'Your True Self',
    subtitle: 'Come home to who you really are',
    arTitle: 'ذاتكِ الحقيقية',
    arSubtitle: 'عودي إلى من أنتِ فعلاً',
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
    arPrompts: [
      "ما الذي يجعلكِ تشعرين بالحياة والصدق أكثر شيء؟",
      "متى تشعرين بأكبر سلام مع من أنتِ؟",
      "كيف تبدو حياتكِ المثالية، وكيف يمكنكِ أن تُواءمي أفعالكِ معها؟",
      "ما شغفكِ، وكيف يمكنكِ أن ترعيه في حياتكِ اليومية؟",
      "ما قيمكِ الأساسية، وكيف تقودكِ في قراراتكِ؟",
      "ما المعتقدات عن نفسكِ التي تريدين أن تتخلّي عنها، ولماذا؟",
      "كيف تعرّفين النجاح لنفسكِ، بعيداً عن توقّعات الخارج؟",
      "كيف يبدو حبّ الذات لكِ، وكيف يمكنكِ ممارسته يومياً؟",
      "ما الذي تخافين التعبير عنه، وماذا سيحدث لو سمحتِ لنفسكِ به؟",
      "بم تشعرين حين تكونين صادقة مع نفسكِ؟",
      "ما نقاط القوة التي تعجبكِ في الآخرين وتسكن فيكِ أيضاً؟",
      "لأيّ شيء تحتاجين أن تسامحي نفسكِ لتخطي إلى ذاتكِ الحقيقية؟",
    ],
  },
  {
    id: 'romanticizing-life',
    title: 'Romanticizing Life',
    subtitle: 'Find the beauty already here',
    arTitle: 'الحياة كما تحلمين بها',
    arSubtitle: 'اكتشفي الجمال الحاضر الآن',
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
    arPrompts: [
      "ما اللحظات التي تجعلكِ تشعرين بالحياة؟",
      "كيف يمكنكِ أن تصنعي المزيد من الجمال في روتينكِ اليومي؟",
      "ما الأشياء البسيطة التي تجلب لكِ الفرح؟",
      "كيف سيبدو يوم أحلامكِ؟",
      "كيف يمكنكِ أن تُبطئي بوعي أكبر؟",
      "ما الأماكن التي تلهمكِ؟",
      "ما العادات التي تجعل الحياة تبدو أكثر لطفاً؟",
      "كيف يمكنكِ أن تجعلي اللحظات العادية مميّزة؟",
      "ما التجارب الحسية التي تُهدّئكِ؟",
      "أيّ نسخة من نفسكِ تريدين أن تجسّديها؟",
      "ما الروتين الذي يجعلكِ تشعرين بالثبات؟",
      "كيف يمكنكِ أن تمارسي الامتنان يومياً؟",
      "ماذا تعني لكِ الحياة الهادئة؟",
      "ما النشاطات التي تعيدكِ إلى نفسكِ؟",
      "كيف يمكنكِ أن تضيفي المزيد من النيّة إلى حياتكِ؟",
    ],
  },
  {
    id: 'glow-up-era',
    title: 'Design Your Glow Up Era',
    subtitle: 'Imagine her in full detail',
    arTitle: 'اصنعي زمنكِ المشرق',
    arSubtitle: 'تخيّليها بكلّ التفاصيل',
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
    arPrompts: [
      "كيف تبدو أفضل نسخة منكِ وكيف تشعر؟",
      "كيف ترتدي ملابسها لتعكس طاقتها؟",
      "كيف يبدو روتينها الصباحي؟",
      "كيف تحدّث نفسها في داخلها؟",
      "ما العادات التي تعيش بها يومياً؟",
      "ما الحدود التي تحميها؟",
      "أيّ نوع من الناس يحيط بها؟",
      "كيف تقضي أمسياتها؟",
      "ما طاقتها المميّزة؟",
      "كيف تعتني بجسدها؟",
      "كيف تعتني بذهنها؟",
      "ما الذي يجلب لها الفرح، صغيره وكبيره؟",
      "كيف تبدو عطلة نهاية أسبوعها المثالية؟",
      "أيّ محتوى تستهلك، ولماذا؟",
      "لأيّ شيء تقول لا؟",
      "كيف تتحرّك عبر التحديات؟",
      "ما الأهداف التي تحمّسها أكثر شيء الآن؟",
      "ما الذي لم تعد تلاحقه؟",
      "كيف تصنع الرومانسية في حياتها؟",
      "ما شعارها لهذا الزمن الجديد؟",
    ],
  },
];

export const ALL_CATEGORIES: JournalCategory[] = [MORNING, NIGHT, ...THEMES];

export function getCategory(id: string): JournalCategory | null {
  return ALL_CATEGORIES.find((c) => c.id === id) ?? null;
}

// Locale-aware view of a category. Screens should call this before reading
// title, subtitle, prompts, or rotate. Length mismatch between prompts and
// arPrompts (or rotate and arRotate) falls back to English for that field
// to avoid index errors downstream.
export function localizeJournalCategory(cat: JournalCategory): JournalCategory {
  if (getLocale() !== 'ar') return cat;
  const arPromptsOK = cat.arPrompts && cat.arPrompts.length === cat.prompts.length;
  const arRotateOK = cat.arRotate && cat.rotate && cat.arRotate.length === cat.rotate.length;
  return {
    ...cat,
    title: cat.arTitle || cat.title,
    subtitle: cat.arSubtitle || cat.subtitle,
    prompts: arPromptsOK ? cat.arPrompts! : cat.prompts,
    rotate: arRotateOK ? cat.arRotate! : cat.rotate,
  };
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
export const CHALLENGE_TITLE_AR = 'تحدّي الكتابة لثلاثين يوماً';

export function challengeTitle(): string {
  return getLocale() === 'ar' ? CHALLENGE_TITLE_AR : CHALLENGE_TITLE;
}

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

export const CHALLENGE_PROMPTS_AR: string[] = [
  "ما الأجزاء من نفسكِ التي تحاولين إخفاءها عن الآخرين، ولماذا؟",
  "متى تشعرين بأقلّ ثقة، وماذا قد يعكس ذلك عن كيف ترين نفسكِ؟",
  "ما المشاعر التي تشعرين بأكبر انزعاج عند التعبير عنها، ولماذا؟",
  "ما الذي يستفزّكِ في الآخرين، وكيف قد يرتبط ذلك بشيء داخلكِ؟",
  "ما الذي تحكمين به سرّاً على الناس، ولماذا؟",
  "ما الرسائل الأساسية التي تلقّيتِها في نشأتكِ عن المشاعر أو النجاح أو الحبّ؟",
  "متى شعرتِ لأوّل مرة بالرفض أو الهجر، وكيف تعاملتِ مع ذلك؟",
  "ما الذي احتجتِه في طفولتكِ أكثر شيء ولم تحصلي عليه؟",
  "أيّ ذكريات ما زالت تجعلكِ تشعرين بالعار أو الصغر؟",
  "ما الأجزاء من شخصيّتكِ التي تخفّفين منها لتكوني مقبولة أو ممدوحة؟",
  "ماذا تخافين أن يفكّر الناس لو عرفوكِ حقاً؟",
  "أين في حياتكِ تدّعين أو تؤدّين دوراً؟",
  "ما الأجزاء من هويتكِ التي تشعرين أنها غير صادقة أو مفروضة؟",
  "ما الذي تشعرين بالعار منه ولم تعترفي به تماماً؟",
  "بأيّ طرق تخونين نفسكِ لتُريحي الآخرين؟",
  "كيف تحضرين عادةً في العلاقات؟ هل تعطين أكثر من اللازم، أم تنسحبين، أم تبحثين عن قبول؟",
  "ما الأنماط التي تتكرّر في علاقاتكِ؟",
  "ما الحدود التي يصعب عليكِ الحفاظ عليها، ولماذا؟",
  "هل هناك شخص في حياتكِ ما زلتِ تشعرين ببعض الاستياء تجاهه؟",
  "ما الذي تتوقّعينه من الآخرين ولا تمنحينه لنفسكِ؟",
  "ما المواقف التي تجعلكِ تشعرين بفقدان السيطرة، وكيف تتفاعلين عادةً؟",
  "متى شكّلتِ موقفاً للحصول على ما تريدين؟",
  "ما الصفات التي تعجبكِ أو تحسدين الآخرين عليها، وكيف قد تسكن فيكِ أيضاً؟",
  "أين تُعطين قوّتكِ خوفاً أو من باب العادة؟",
  "ما القصص التي تحكينها لنفسكِ لتُبقيكِ صغيرة أو آمنة؟",
  "أيّ جزء منكِ أنتِ مستعدّة لاستعادته وإخراجه إلى النور؟",
  "بم ستشعرين لو قبلتِ كلّ جزء منكِ تماماً؟",
  "ماذا سيتغيّر لو توقّفتِ عن البحث عن الموافقة ووثقتِ بصوتكِ؟",
  "أيّ نسخة منكِ أنتِ مستعدّة أن تطلقيها، ومن تصبحين؟",
  "أيّ حقيقة عن نفسكِ أنتِ مستعدّة أخيراً لقبولها برأفة؟",
];

// Locale-aware view of a challenge prompt by index. Length mismatch falls
// back to English for that index.
export function challengePromptAt(i: number): string {
  const en = CHALLENGE_PROMPTS[i] ?? '';
  if (getLocale() !== 'ar') return en;
  if (CHALLENGE_PROMPTS_AR.length !== CHALLENGE_PROMPTS.length) return en;
  return CHALLENGE_PROMPTS_AR[i] ?? en;
}
