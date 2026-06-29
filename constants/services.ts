// The Intend - real expert services transferred from the Wix book-online page.
// Bookable offerings shown on each expert profile.

export type Service = {
  id: string;
  expertId: string;
  name: string;
  tagline: string;
  durationMin: number | null;
  price: string;
  online: boolean;
  inPerson: boolean;
  image: string | null;
};

export const EXPERT_SERVICES: Service[] = [
  { id: 'scheherazade-hasan-60-minute-session', expertId: 'scheherazade-hasan', name: '60-Minute Session', tagline: '1-Hour Financial Clarity & Direction Session', durationMin: 60, price: 'AED 550', online: true, inPerson: false, image: 'https://static.wixstatic.com/media/5445e6_fe8c848e767e4968805fc29ba276e08c~mv2.jpg' },
  { id: 'scheherazade-hasan-30-minute-session', expertId: 'scheherazade-hasan', name: '30-Minute Session', tagline: '30-Minute Money Decision Clarity Call', durationMin: 30, price: 'AED 275', online: true, inPerson: false, image: 'https://static.wixstatic.com/media/5445e6_fe8c848e767e4968805fc29ba276e08c~mv2.jpg' },
  { id: 'omar-chtioui-5-session-package', expertId: 'omar-chtioui', name: '5 Session Package', tagline: '', durationMin: 90, price: 'Custom pricing', online: false, inPerson: false, image: 'https://static.wixstatic.com/media/5445e6_c30b5193603e46d990e3f5a3ffb7ef3f~mv2.jpeg' },
  { id: 'omar-chtioui-30-minute-session', expertId: 'omar-chtioui', name: '30-Minute Session', tagline: '', durationMin: 30, price: 'AED 365', online: true, inPerson: false, image: 'https://static.wixstatic.com/media/5445e6_d9c384e3196f4b29984bfaee2bdf4369~mv2.jpg' },
  { id: 'omar-chtioui-90-minute-session', expertId: 'omar-chtioui', name: '90-Minute Session', tagline: '', durationMin: 90, price: 'AED 1,100', online: true, inPerson: false, image: 'https://static.wixstatic.com/media/5445e6_d9c384e3196f4b29984bfaee2bdf4369~mv2.jpg' },
  { id: 'ekaterina-murray-30-minute-session', expertId: 'ekaterina-murray', name: '30-Minute Session', tagline: '30-Minute Online Video Call', durationMin: 30, price: 'AED 220', online: true, inPerson: false, image: 'https://static.wixstatic.com/media/5445e6_7f29c751856b44ba9d514866a0251eab~mv2.jpeg' },
  { id: 'ekaterina-murray-60-minute-session', expertId: 'ekaterina-murray', name: '60-Minute Session', tagline: '60-Minute Online Video Call', durationMin: 60, price: 'AED 365', online: true, inPerson: false, image: 'https://static.wixstatic.com/media/5445e6_7f29c751856b44ba9d514866a0251eab~mv2.jpeg' },
  { id: 'irina-goldenberg-60-minute-session', expertId: 'irina-goldenberg', name: '60-Minute Session', tagline: '60-Minute Online Video Call', durationMin: 60, price: 'AED 365', online: true, inPerson: false, image: 'https://static.wixstatic.com/media/5445e6_cc83748887964f41b610058e7c362806~mv2.jpg' },
  { id: 'zahra-gozal-free-discovery-call-20-30-min', expertId: 'zahra-gozal', name: 'Free Discovery Call (20-30 min)', tagline: 'A short introductory call to understand where you are and what you are looking for.', durationMin: 30, price: 'Free', online: false, inPerson: true, image: 'https://static.wixstatic.com/media/5445e6_f8d8fb735b334502ad21ff7ee34bbd55~mv2.jpg' },
  { id: 'zahra-gozal-60-minute-session', expertId: 'zahra-gozal', name: '60-Minute Session', tagline: '', durationMin: 60, price: 'AED 735', online: true, inPerson: false, image: 'https://static.wixstatic.com/media/5445e6_f8d8fb735b334502ad21ff7ee34bbd55~mv2.jpg' },
  { id: 'zahra-gozal-2-hour-session-in-person', expertId: 'zahra-gozal', name: '2 Hour Session (In Person)', tagline: '', durationMin: 120, price: 'AED 1,650', online: false, inPerson: true, image: 'https://static.wixstatic.com/media/5445e6_f8d8fb735b334502ad21ff7ee34bbd55~mv2.jpg' },
  { id: 'alevtina-buzynarska-body-sensors-activation', expertId: 'alevtina-buzynarska', name: 'Body Sensors Activation (1:1 sessions)', tagline: 'Body Sensors Activation - 90 Minutes', durationMin: 90, price: 'AED 800', online: true, inPerson: false, image: 'https://static.wixstatic.com/media/5445e6_6ac95a73fec641759202d396086e342f~mv2.jpg' },
  { id: 'alevtina-buzynarska-free-consultation', expertId: 'alevtina-buzynarska', name: 'Free Consultation - 30 Minutes', tagline: '', durationMin: 30, price: 'Free', online: false, inPerson: true, image: 'https://static.wixstatic.com/media/5445e6_6ac95a73fec641759202d396086e342f~mv2.jpg' },
  { id: 'alevtina-buzynarska-energy-cord-cutting', expertId: 'alevtina-buzynarska', name: 'Energy Cord Cutting - Group or Private', tagline: '', durationMin: 180, price: 'Custom pricing', online: true, inPerson: false, image: 'https://static.wixstatic.com/media/5445e6_6ac95a73fec641759202d396086e342f~mv2.jpg' },
  { id: 'alevtina-buzynarska-lilith-5-week', expertId: 'alevtina-buzynarska', name: 'Lilith: Awakening Pleasure - 5-Week Program', tagline: '5-week program', durationMin: 90, price: 'Custom pricing', online: false, inPerson: false, image: 'https://static.wixstatic.com/media/5445e6_6ac95a73fec641759202d396086e342f~mv2.jpg' },
  { id: 'alevtina-buzynarska-moana-5-week', expertId: 'alevtina-buzynarska', name: 'Moana - 5-Week Program', tagline: 'A feminine embodiment journey focused on nervous system regulation and emotional balance.', durationMin: 90, price: 'Custom pricing', online: false, inPerson: false, image: 'https://static.wixstatic.com/media/5445e6_6ac95a73fec641759202d396086e342f~mv2.jpg' },
  { id: 'joanna-gudkina-initial-consultation', expertId: 'joanna-gudkina', name: 'Initial Consultation - 60 minutes', tagline: '', durationMin: 60, price: 'AED 900', online: true, inPerson: false, image: 'https://static.wixstatic.com/media/5445e6_8e17059cd5194e4ab48b15b84958a78f~mv2.jpg' },
  { id: 'joanna-gudkina-follow-up-session', expertId: 'joanna-gudkina', name: 'Follow-up Session - 30 minutes', tagline: '', durationMin: 30, price: 'AED 475', online: true, inPerson: false, image: 'https://static.wixstatic.com/media/5445e6_8e17059cd5194e4ab48b15b84958a78f~mv2.jpg' },
  { id: 'joanna-gudkina-atlasprofilax', expertId: 'joanna-gudkina', name: 'AtlasPROfilax - One-time session', tagline: '', durationMin: 45, price: 'AED 3,100', online: true, inPerson: false, image: 'https://static.wixstatic.com/media/5445e6_8e17059cd5194e4ab48b15b84958a78f~mv2.jpg' },
];
