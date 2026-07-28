// One featured session per expert, shown on the Sessions tab. The serviceId
// must match a row in the services table, since the card books it directly.
//
// title reading "90 minutes with Omar" splits itself on the card. A title with
// no "with" in it needs lead set, so the duration still shows above the name.
//
// Keep the copy to one line. It sits under the title on a small card and a
// second line will crowd it.

export type Highlight = {
  expertId: string;
  serviceId: string;
  title: string;
  copy: string;
  lead?: string;
  free?: boolean;
};

export const HIGHLIGHTS: Highlight[] = [
  {
    expertId: 'omar-chtioui',
    serviceId: 'omar-90',
    title: '90 minutes with Omar',
    copy: 'Breath and nervous system work for what the body has been holding on to.',
  },
  {
    expertId: 'scheherazade-hasan',
    serviceId: 'scheherazade-hasan-60-minute-session',
    title: '60 minutes with Scheherazade',
    copy: 'Where your money stress actually comes from, and a calmer way to decide.',
  },
  {
    expertId: 'joanna-gudkina',
    serviceId: 'joanna-gudkina-initial-consultation',
    title: 'Personalised plan call',
    lead: '60 minutes',
    copy: 'A full look at what is driving a skin or health concern, and where to start.',
  },
  {
    expertId: 'zahra-gozal',
    serviceId: 'zahra-60',
    title: '60 minutes with Zahra',
    copy: 'Working with the body, not just the conversation, when thinking has not shifted it.',
  },
  {
    expertId: 'ekaterina-murray',
    serviceId: 'ekaterina-murray-30-minute-session',
    title: '30 minutes with Ekaterina',
    copy: 'For when a life transition has loosened your sense of who you are.',
  },
  {
    expertId: 'irina-goldenberg',
    serviceId: 'irina-goldenberg-60-minute-session',
    title: '60 minutes with Irina',
    copy: 'Releasing the tension the body holds long before the mind can name it.',
  },
  {
    expertId: 'alevtina-buzynarska',
    serviceId: 'alev-free',
    title: 'Feminine embodiment call',
    lead: '30 minutes',
    copy: 'A first conversation about feeling flat or disconnected, and what would help.',
    free: true,
  },
];
