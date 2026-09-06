// The translation dictionary. Keys are dotted paths so strings live next to
// what they mean and stay easy to find. English first, Arabic second, more
// languages added later if needed.
//
// Voice for Arabic:
//   Honest, calm, effortless, non-promotional. MSA with light Khaleeji
//   warmth. Never word-for-word from English; adapt to sound natural.
//   Feminine second person by default. Letter-spacing zero on Arabic type
//   (set at the style level, not here).
//
// New keys are added as each screen is translated. This file is expected to
// grow substantially over the coming stages of the migration.

type Entry = { en: string; ar: string };

export const STRINGS = {
  // Common controls
  'common.continue':      { en: 'Continue',       ar: 'متابعة' },
  'common.cancel':        { en: 'Cancel',         ar: 'إلغاء' },
  'common.close':         { en: 'Close',          ar: 'إغلاق' },
  'common.save':          { en: 'Save',           ar: 'حفظ' },
  'common.remove':        { en: 'Remove',         ar: 'إزالة' },
  'common.tryAgain':      { en: 'Try again',      ar: 'حاولي مرة أخرى' },
  'common.leaveIt':       { en: 'Leave it',       ar: 'دعيها' },

  // Settings modal
  'settings.title':         { en: 'Settings',              ar: 'الإعدادات' },
  'settings.personalInfo':  { en: 'Personal information',  ar: 'المعلومات الشخصية' },
  'settings.adminPanel':    { en: 'Admin panel',           ar: 'لوحة الإدارة' },
  'settings.expertPanel':   { en: 'Expert panel',          ar: 'لوحة الخبيرة' },
  'settings.myOrders':      { en: 'My orders',             ar: 'طلباتي' },
  'settings.helpSupport':   { en: 'Help & support',        ar: 'المساعدة والدعم' },
  'settings.privacy':       { en: 'Privacy',               ar: 'الخصوصية' },
  'settings.signOut':       { en: 'Sign out',              ar: 'تسجيل الخروج' },
  'settings.signIn':        { en: 'Sign in',               ar: 'تسجيل الدخول' },
  'settings.language':      { en: 'Language',              ar: 'اللغة' },

  // Language switch sheet
  'language.title':         { en: 'Language',              ar: 'اللغة' },
  'language.subtitle':      { en: 'Choose your language',  ar: 'اختاري لغتكِ' },
  'language.restartNote':   { en: 'The app will restart so the new language takes effect.', ar: 'سنُعيد تشغيل التطبيق حتى تتغيّر اللغة.' },
  'language.english':       { en: 'English',               ar: 'English' },
  'language.arabic':        { en: 'Arabic',                ar: 'العربية' },

  // Header + profile
  'you.yourSpace':          { en: 'Your space at The Intend', ar: 'مساحتكِ في The Intend' },
  'role.admin':             { en: 'ADMIN',   ar: 'مديرة' },
  'role.expert':            { en: 'EXPERT',  ar: 'خبيرة' },

  // Rhythm strip
  'rhythm.day':             { en: 'day',    ar: 'يوم' },
  'rhythm.days':            { en: 'days',   ar: 'أيام' },
  'rhythm.current':         { en: 'CURRENT STREAK',  ar: 'التتابع الحالي' },

  // Mood insight
  'mood.gentleNote':        { en: 'A GENTLE NOTE',    ar: 'ملاحظة صغيرة' },
  'mood.noticed':           { en: "We've noticed you've been feeling {mood} lately.", ar: 'لاحظنا أنكِ تشعرين بـ {mood} مؤخراً.' },
  'mood.expertReco':        { en: 'An expert who could help', ar: 'خبيرة قد تفيدكِ' },
  'mood.soundReco':         { en: 'A sound to settle into',   ar: 'صوت يُهدّئكِ' },
  'mood.readReco':          { en: 'A read that might land',   ar: 'قراءة قد تلامسكِ' },
  'mood.minRead':           { en: '{min} min read',  ar: '{min} دقيقة قراءة' },

  // Sessions
  'sessions.section':       { en: 'YOUR SESSIONS',    ar: 'جلساتك' },
  'sessions.upcoming':      { en: 'Upcoming',         ar: 'القادمة' },
  'sessions.past':          { en: 'Past',             ar: 'السابقة' },
  'sessions.noneUpcoming':  { en: 'No upcoming sessions yet.', ar: 'لا توجد جلسات قادمة بعد.' },
  'sessions.pastEmpty':     { en: 'Your completed sessions will appear here.', ar: 'ستظهر جلساتكِ المكتملة هنا.' },
  'sessions.browse':        { en: 'Browse sessions',  ar: 'تصفّحي الجلسات' },

  // Packages
  'pkg.yours':              { en: 'Your packages',    ar: 'باقاتك' },
  'pkg.remaining':          { en: '{remaining} of {total} sessions remaining', ar: 'متبقّي {remaining} من {total} جلسات' },
  'pkg.choose':             { en: 'Choose a date for session {n} of {total}', ar: 'اختاري موعد الجلسة {n} من {total}' },
  'pkg.openLink':           { en: 'Open join link',   ar: 'افتحي رابط الانضمام' },
  'pkg.location':           { en: 'Location: {link}', ar: 'المكان: {link}' },
  'pkg.waitingLink':        { en: 'Waiting for the link from your expert', ar: 'في انتظار الرابط من الخبيرة' },

  // Booking row
  'booking.movedByExpert':  { en: 'Your expert had to move this. Choose a new time that suits you.', ar: 'اضطرّت الخبيرة إلى تغيير الموعد. اختاري وقتاً يناسبكِ.' },
  'booking.withExpert':     { en: 'with {name}',      ar: 'مع {name}' },
  'booking.changeTime':     { en: 'Change time',      ar: 'تغيير الموعد' },
  'booking.chooseNew':      { en: 'Choose a new time', ar: 'اختاري موعداً جديداً' },
  'booking.bookAgain':      { en: 'Book again',       ar: 'احجزي مرة أخرى' },
  'booking.yourNoteLabel':  { en: 'YOUR NOTE',        ar: 'ملاحظتكِ' },
  'booking.addNote':        { en: 'Add a note from this session', ar: 'أضيفي ملاحظة عن هذه الجلسة' },
  'booking.yourNoteTitle':  { en: 'Your note',        ar: 'ملاحظتكِ' },
  'booking.noteHint':       { en: 'What came up, what you want to remember, what you are taking with you.', ar: 'ما الذي طرأ، ما تودّين تذكّره، ما تحملينه معكِ.' },
  'booking.saveNote':       { en: 'Save note',        ar: 'حفظ الملاحظة' },

  // Change time alerts
  'change.movingTitle':     { en: 'We will move this for you', ar: 'سنُحرّك هذا نيابةً عنكِ' },
  'change.movingBody':      { en: 'This booking was made before times could be changed here. Message us and we will sort it.', ar: 'هذه الجلسة حُجزت قبل إتاحة تغيير المواعيد هنا. راسلينا ونتكفّل بذلك.' },
  'change.couldNotOpen':    { en: 'We could not open that',     ar: 'لم نتمكن من فتحها' },
  'change.tryLater':        { en: 'Try again in a moment.',     ar: 'جرّبي مرة أخرى بعد قليل.' },
  'change.needsUs':         { en: 'This one needs us',          ar: 'هذه بحاجة إلينا' },
  'change.soonTitle':       { en: 'This one is soon',           ar: 'هذه قريبة' },
  'change.soonBody':        { en: 'Your session is in about {hours} hours. Would you still like to move it?', ar: 'جلستكِ بعد نحو {hours} ساعة. أما زلتِ تودّين تحريكها؟' },
  'change.saveErrorTitle':  { en: 'Could not save',             ar: 'لم نتمكن من الحفظ' },
  'change.saveErrorBody':   { en: 'Please try again.',          ar: 'حاولي مرة أخرى، من فضلكِ.' },

  // Resume
  'resume.section':         { en: 'PICK UP WHERE YOU LEFT OFF', ar: 'أكملي من حيث توقفتِ' },

  // Companion
  'companion.section':      { en: 'MY COMPANION',     ar: 'رفيقتكِ' },
  'companion.title':        { en: 'My Companion',     ar: 'رفيقتكِ' },
  'companion.sub':          { en: 'Think out loud. See what is really going on.', ar: 'فكّري بصوت عالٍ. اكتشفي ما يجري فعلاً.' },

  // Journal
  'journal.section':        { en: 'YOUR JOURNAL',     ar: 'مذكّراتك' },
  'journal.empty':          { en: 'Nothing written yet. Your entries will collect here.', ar: 'لم تُكتَب أي مذكّرات بعد. ستتجمّع هنا.' },
  'journal.open':           { en: 'Open journal',     ar: 'افتحي المذكّرات' },

  // Saved & liked
  'savedLiked.section':     { en: 'SAVED AND LIKED',  ar: 'المحفوظات والمُفضّلات' },
  'savedLiked.saved':       { en: 'Saved',            ar: 'محفوظ' },
  'savedLiked.liked':       { en: 'Liked',            ar: 'مُفضّل' },
  'savedLiked.savedEmpty':  { en: 'Nothing saved yet. Tap the bookmark on any article or e-book.', ar: 'لم تحفظي شيئاً بعد. اضغطي على الإشارة المرجعية في أي مقال أو كتاب.' },
  'savedLiked.likedEmpty':  { en: 'Nothing liked yet. Tap the heart on anything you want to keep.', ar: 'لم تُعجَبي بشيء بعد. اضغطي على القلب لكل ما تودّين الاحتفاظ به.' },

  // Progress
  'progress.section':       { en: 'YOUR PROGRESS',    ar: 'تقدّمك' },
  'progress.read':          { en: 'Read',             ar: 'قراءات' },
  'progress.sessions':      { en: 'Sessions',         ar: 'جلسات' },
  'progress.journals':      { en: 'Journals',         ar: 'مذكّرات' },
  'progress.workbooks':     { en: 'Workbooks',        ar: 'دفاتر عمل' },
  'progress.title':         { en: 'Progress & achievements', ar: 'التقدّم والإنجازات' },
  'progress.sub':           { en: 'Your journey so far', ar: 'رحلتكِ حتى الآن' },

  // Notifications sheet
  'notifs.title':           { en: 'Notifications',    ar: 'الإشعارات' },
  'notifs.empty':           { en: 'Nothing right now. Upcoming sessions and packages waiting to be booked will show up here.', ar: 'لا يوجد شيء حالياً. ستظهر هنا الجلسات القادمة والباقات التي تنتظر الحجز.' },

  // Photo options
  'photo.title':            { en: 'Profile photo',    ar: 'صورة الملف' },
  'photo.choose':           { en: 'Choose new photo', ar: 'اختاري صورة جديدة' },
  'photo.remove':           { en: 'Remove photo',     ar: 'إزالة الصورة' },

  // Sign-in lock (demo overlay)
  'lock.title':             { en: 'Your profile',     ar: 'ملفكِ' },
  'lock.text':              { en: 'Sign in or create an account to view your profile, see your bookings and track your progress.', ar: 'سجّلي دخولكِ أو أنشئي حساباً لرؤية ملفكِ ومتابعة حجوزاتكِ وتقدّمكِ.' },
  'lock.cta':               { en: 'Sign in or create account', ar: 'تسجيل الدخول أو إنشاء حساب' },
} as const satisfies Record<string, Entry>;

export type StringKey = keyof typeof STRINGS;
