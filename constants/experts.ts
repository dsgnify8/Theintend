// The Intend — expert directory.
// Profiles (bio, title, FAQs) are the real summaries from your site. Photos are
// imported from theintend.com/experts. Each expert's offerings (classes, programs,
// consultations) are drawn from your Sessions data by matching expertId.

export type Expert = {
  id: string;
  name: string;
  title: string;
  category: string;
  blurb: string;
  bio: string;
  faqs: string[];
  profileUrl: string;
  photo: string | null;
  photoScale?: number;
  photoX?: number;
  photoY?: number;
  availability?: any;
};

export const EXPERTS: Expert[] = [
  {
    id: 'omar-chtioui',
    name: 'Omar Chtioui',
    title: 'Trauma Healing · Breathwork',
    category: 'Breathwork',
    blurb: `For those ready to move beyond talk and into the body. Omar works with breath and the nervous system to help people access and release what has been stored for too long.`,
    bio: `Omar Chtioui is a Therapeutic Breath Practitioner and Trainer in the Arab world. His work explores the lasting impact of pregnancy and childbirth trauma on how we think, feel, and behave. He helps clients access deep inner awareness, understand their life path, and develop new coping mechanisms, working with the nervous system, developmental psychology, and chemical respiration.`,
    faqs: [
      `My relationship with my mother has always been difficult and I can't seem to move past it.`,
      `I've been carrying this fear and anxiety my whole life, I don't know where it started.`,
      `My body is healthy but I still can't get pregnant. Could something deeper be blocking this?`,
    ],
    profileUrl: 'https://www.theintend.com/experts',
    photo: 'https://static.wixstatic.com/media/5445e6_c30b5193603e46d990e3f5a3ffb7ef3f~mv2.jpeg',
  },
  {
    id: 'scheherazade-hasan',
    name: 'Scheherazade Hasan',
    title: 'Wealth Coach',
    category: 'Wealth',
    blurb: `Focusing on the intersection of financial strategy and human behavior. Scheherazade helps people understand what is driving their relationship with money and build practical systems that support their present life and long-term goals.`,
    bio: `A wealth coach who helps people make confident, values-aligned decisions with their money, without shame or rigid rules. Her work sits at the intersection of practical financial strategy and human behavior. A former financial advisor and portfolio manager, she helps clients understand what really drives their money stress and build simple systems that support both their present life and future goals.`,
    faqs: [
      `What's the smartest next step with my money?`,
      `Am I overthinking this, or missing something important?`,
      `I always feel like I'm running out of money, why is that?`,
    ],
    profileUrl: 'https://www.theintend.com/experts',
    photo: 'https://static.wixstatic.com/media/5445e6_b489e1d91e9f48e9949985e30007600b~mv2.jpg',
  },
  {
    id: 'ekaterina-murray',
    name: 'Ekaterina Murray',
    title: 'Neuropsychology & Identity Specialist',
    category: 'Identity',
    blurb: `With a focus on how the brain shapes identity, behavior, and decision-making. Ekaterina works with people navigating significant life transitions, helping them rebuild a stable sense of self and reconnect with their own direction.`,
    bio: `Ekaterina's foundation is in neuropsychology and neurocoaching, examining how the brain shapes how we perceive ourselves and make decisions. Over hundreds of sessions with people in major life transitions, she developed a precise ability to find where someone has lost connection with their sense of self, and what is needed to rebuild it. Her work is especially relevant during identity disruption, major decisions, and transitions where the psychological foundation needs rebuilding.`,
    faqs: [
      `I'm having difficulty making important choices despite understanding the situation logically.`,
      `I keep repeating emotional patterns in relationships, work, and life decisions. How can I change this?`,
      `I feel stuck between two life stages or roles.`,
    ],
    profileUrl: 'https://www.theintend.com/experts',
    photo: 'https://static.wixstatic.com/media/5445e6_7f29c751856b44ba9d514866a0251eab~mv2.jpeg',
  },
  {
    id: 'joanna-gudkina',
    name: 'Dr. Joanna Gudkina',
    title: 'Dermatologist & Integrative Medicine Specialist',
    category: 'Skin & Longevity',
    blurb: `A dermatologist and integrative medicine specialist with over 20 years of experience. She combines classical medicine with advanced diagnostics and personalized protocols to support lasting health and healing.`,
    bio: `Dr. Joanna Gudkina brings together classical dermatology and integrative medicine, with over 20 years of experience. She works with a limited number of patients at a time, guiding each one personally from initial diagnostics through to long-term results. Her approach draws on advanced anti-age medicine, personalized nutrition, bioresonance diagnostics, peptide therapy, and more, addressing root causes rather than surface symptoms. Consultations are available in Dubai and online.`,
    faqs: [
      `Can you help me find the right peptide for my needs?`,
      `I've had a skin concern for years and nothing has worked. Where would we even start?`,
      `I want to focus on anti-aging and perfect skin without botox or fillers.`,
    ],
    profileUrl: 'https://www.theintend.com/experts',
    photo: 'https://static.wixstatic.com/media/5445e6_50e4762e170a491786f9f1df3d4c9295~mv2.jpeg',
  },
  {
    id: 'zahra-gozal',
    name: 'Zahra Gozal',
    title: 'Transformational Coach & Emotional Bodywork Therapist',
    category: 'Body & Somatics',
    blurb: `An ICF-accredited coach and emotional bodywork therapist who works with the body, not just the mind. For people navigating identity shifts, stuck patterns, or a lost sense of self.`,
    bio: `Zahra Gozal is an ICF-accredited transformational coach and emotional bodywork therapist with a background in psychology. Her approach does not stop at conversation: she works with the body directly, integrating somatic touch, emotional bodywork, mandala therapy, and archetypal frameworks to reach what thinking alone cannot. She specialises in moments of identity disruption, helping people rebuild inner structure and the self-trust needed to move forward. She is based in Dubai and works in person and online.`,
    faqs: [
      `I feel like there is more in me but I can't get it out or access it.`,
      `I've tried therapy and I understand my patterns, but I still can't seem to change them.`,
      `I've rebuilt my life on the outside, but on the inside nothing has really changed.`,
    ],
    profileUrl: 'https://www.theintend.com/experts',
    photo: 'https://static.wixstatic.com/media/5445e6_1c2f322723d24ed88816686e615cbbcb~mv2.jpg',
  },
  {
    id: 'alevtina-buzynarska',
    name: 'Alevtina Buzynarska',
    title: 'Feminine Embodiment Coach, Somatic Guide & Energy Healer',
    category: 'Body & Somatics',
    blurb: `A somatic and energy-based healer for women who are functioning on the outside but feel flat or disconnected within. Her work helps restore feeling, release stored emotions, and return home to the body.`,
    bio: `Alevtina is a somatic and energy-based healer working with women who function on the outside but feel flat or disconnected within. With 9+ years of experience through Sacred Soma School, she uses somatic work, Taoist practices, and energy-based techniques to shift the emotional patterns and nervous system states that keep women stuck. She works directly with the body, where real change happens, offering private sessions and structured programs.`,
    faqs: [
      `I don't feel as feminine anymore and I don't know who I am outside of my relationship.`,
      `I'm always moving fast and don't feel like I can slow down and rest.`,
      `I want more love and passion out of my life and my relationships.`,
    ],
    profileUrl: 'https://www.theintend.com/experts',
    photo: 'https://static.wixstatic.com/media/5445e6_72bd9b4dafc149ecb05aec5964d7e167~mv2.jpg',
  },
  {
    id: 'irina-goldenberg',
    name: 'Irina Goldenberg',
    title: 'Kundalini Yoga & Somatic Specialist',
    category: 'Body & Somatics',
    blurb: `Working with the body as the starting point for change. Irina helps people release physical tension, regulate their nervous system, and return to a state where the body and mind feel aligned again.`,
    bio: `Irina has taught Kundalini yoga since 2017, with training in Portugal and years of practice across Moscow and Bali, plus five years studying osteopathic energy work and breathwork. She works directly with the stress and tension the body holds before the mind can name it. Through breathwork, somatic movement, and Kundalini practice, she helps people release what has accumulated, restore proper breathing, and bring the nervous system back to a regulated state. Especially valuable for chronic stress, burnout, persistent tension, and disrupted sleep.`,
    faqs: [
      `My body constantly feels tense and I am always rushing. How can I calm my internal state?`,
      `I get out of breath very quickly and my body reacts fast when I am stressed or angry.`,
      `I have neck pain that leads to headaches. How can I relieve this tension?`,
    ],
    profileUrl: 'https://www.theintend.com/experts',
    photo: 'https://static.wixstatic.com/media/5445e6_cc83748887964f41b610058e7c362806~mv2.jpg',
  },
];
