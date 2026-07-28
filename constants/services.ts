// The Intend, real expert services. Images live in Supabase Storage.
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
  { id: 'scheherazade-hasan-60-minute-session', expertId: 'scheherazade-hasan', name: '60-Minute Session', tagline: '1-Hour Financial Clarity & Direction Session', durationMin: 60, price: 'AED 550', online: true, inPerson: false, image: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/site-media/services/scheherazade-hasan-60-minute-session.jpg' },
  { id: 'scheherazade-hasan-30-minute-session', expertId: 'scheherazade-hasan', name: '30-Minute Session', tagline: '30-Minute Money Decision Clarity Call', durationMin: 30, price: 'AED 275', online: true, inPerson: false, image: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/site-media/services/scheherazade-hasan-30-minute-session.jpg' },
  { id: 'omar-chtioui-5-session-package', expertId: 'omar-chtioui', name: '5 Session Package', tagline: '', durationMin: 90, price: 'Custom pricing', online: false, inPerson: false, image: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/expert-photos/omar-chtioui/1785063943143.avif' },
  { id: 'omar-chtioui-30-minute-session', expertId: 'omar-chtioui', name: '30-Minute Session', tagline: '', durationMin: 30, price: 'AED 365', online: true, inPerson: false, image: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/expert-photos/omar-chtioui/1785063943143.avif' },
  { id: 'omar-chtioui-90-minute-session', expertId: 'omar-chtioui', name: '90-Minute Session', tagline: '', durationMin: 90, price: 'AED 1,100', online: true, inPerson: false, image: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/expert-photos/omar-chtioui/1785063943143.avif' },
  { id: 'ekaterina-murray-30-minute-session', expertId: 'ekaterina-murray', name: '30-Minute Session', tagline: '30-Minute Online Video Call', durationMin: 30, price: 'AED 220', online: true, inPerson: false, image: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/site-media/services/ekaterina-murray-30-minute-session.jpg' },
  { id: 'ekaterina-murray-60-minute-session', expertId: 'ekaterina-murray', name: '60-Minute Session', tagline: '60-Minute Online Video Call', durationMin: 60, price: 'AED 365', online: true, inPerson: false, image: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/site-media/services/ekaterina-murray-60-minute-session.jpg' },
  { id: 'irina-goldenberg-60-minute-session', expertId: 'irina-goldenberg', name: '60-Minute Session', tagline: '60-Minute Online Video Call', durationMin: 60, price: 'AED 365', online: true, inPerson: false, image: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/site-media/services/irina-goldenberg-60-minute-session.jpg' },
  { id: 'zahra-gozal-free-discovery-call-20-30-min', expertId: 'zahra-gozal', name: 'Free Discovery Call (20-30 min)', tagline: 'A short introductory call to understand where you are and what you are looking for.', durationMin: 30, price: 'Free', online: false, inPerson: true, image: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/expert-photos/zahra-gozal/1785064025327.avif' },
  { id: 'zahra-gozal-60-minute-session', expertId: 'zahra-gozal', name: '60-Minute Session', tagline: '', durationMin: 60, price: 'AED 735', online: true, inPerson: false, image: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/expert-photos/zahra-gozal/1785064025327.avif' },
  { id: 'zahra-gozal-2-hour-session-in-person', expertId: 'zahra-gozal', name: '2 Hour Session (In Person)', tagline: '', durationMin: 120, price: 'AED 1,650', online: false, inPerson: true, image: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/expert-photos/zahra-gozal/1785064025327.avif' },
  { id: 'alevtina-buzynarska-body-sensors-activation', expertId: 'alevtina-buzynarska', name: 'Body Sensors Activation (1:1 sessions)', tagline: 'Body Sensors Activation - 90 Minutes', durationMin: 90, price: 'AED 800', online: true, inPerson: false, image: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/expert-photos/alevtina-buzynarska/1785064065894.png' },
  { id: 'alevtina-buzynarska-free-consultation', expertId: 'alevtina-buzynarska', name: 'Free Consultation - 30 Minutes', tagline: '', durationMin: 30, price: 'Free', online: false, inPerson: true, image: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/expert-photos/alevtina-buzynarska/1785064065894.png' },
  { id: 'alevtina-buzynarska-energy-cord-cutting', expertId: 'alevtina-buzynarska', name: 'Energy Cord Cutting - Group or Private', tagline: '', durationMin: 180, price: 'Custom pricing', online: true, inPerson: false, image: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/expert-photos/alevtina-buzynarska/1785064065894.png' },
  { id: 'alevtina-buzynarska-lilith-5-week', expertId: 'alevtina-buzynarska', name: 'Lilith: Awakening Pleasure - 5-Week Program', tagline: '5-week program', durationMin: 90, price: 'Custom pricing', online: false, inPerson: false, image: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/expert-photos/alevtina-buzynarska/1785064065894.png' },
  { id: 'alevtina-buzynarska-moana-5-week', expertId: 'alevtina-buzynarska', name: 'Moana - 5-Week Program', tagline: 'A feminine embodiment journey focused on nervous system regulation and emotional balance.', durationMin: 90, price: 'Custom pricing', online: false, inPerson: false, image: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/expert-photos/alevtina-buzynarska/1785064065894.png' },
  { id: 'joanna-gudkina-initial-consultation', expertId: 'joanna-gudkina', name: 'Initial Consultation - 60 minutes', tagline: '', durationMin: 60, price: 'AED 900', online: true, inPerson: false, image: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/site-media/services/joanna-gudkina-initial-consultation.jpg' },
  { id: 'joanna-gudkina-follow-up-session', expertId: 'joanna-gudkina', name: 'Follow-up Session - 30 minutes', tagline: '', durationMin: 30, price: 'AED 475', online: true, inPerson: false, image: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/site-media/services/joanna-gudkina-follow-up-session.jpg' },
  { id: 'joanna-gudkina-atlasprofilax', expertId: 'joanna-gudkina', name: 'AtlasPROfilax - One-time session', tagline: '', durationMin: 45, price: 'AED 3,100', online: true, inPerson: false, image: 'https://xpjtyjjbgvemwwpnxtad.supabase.co/storage/v1/object/public/site-media/services/joanna-gudkina-atlasprofilax.jpg' },
];
