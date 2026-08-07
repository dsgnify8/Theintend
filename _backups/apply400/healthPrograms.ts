// The health programs. Written by Dr. Joanna Gudkina and sold one at a time.
//
// Called health programs everywhere, because app/program/ is already the multi
// session programs an expert runs over weeks. Different thing, different route.

export type HealthProgram = {
  id: string;
  title: string;
  // One line on the card, and the reason someone opens it.
  blurb: string;
  // What it is for, in a few words, above the title.
  focus: string;
  weeks: string;
  html: any;
};

// In dollars, because it is sold through Apple. Roughly the price of a
// paperback, not the 899 dirhams this first said.
export const HEALTH_PROGRAM_PRICE_USD = 29;
export const HEALTH_PROGRAM_AUTHOR = 'Dr. Joanna Gudkina';
// Whose profile carries them. Named here rather than worked out from who has
// programs, so putting them on a second profile stays a decision.
export const HEALTH_PROGRAM_EXPERT_ID = 'joanna-gudkina';

// How far someone reads before being asked to buy. A whole first screen, so
// they have seen enough to know whether they want it.
export const PREVIEW_STOP = 1;

export const HEALTH_PROGRAMS: HealthProgram[] = [
  {
    id: 'joint-support',
    title: 'Joint Support and Regeneration',
    focus: 'Joints, cartilage and tendons',
    blurb: 'For joints that ache, stiffen or have stopped recovering the way they used to. Nutrition, movement, supplementation and peptide therapy run together over eight weeks.',
    weeks: '8 to 12 weeks',
    html: require('../assets/programs/joint-support.html'),
  },
  {
    id: 'weight-management',
    title: 'Weight Management and Metabolic Optimization',
    focus: 'Weight, visceral fat and metabolism',
    blurb: 'For weight that will not move and the metabolism underneath it. Comes in three levels, from a straightforward start to a full protocol, so it can meet you where you are.',
    weeks: '3 to 6 months',
    html: require('../assets/programs/weight-management.html'),
  },
  {
    id: 'gut-healing',
    title: 'Gastrointestinal Healing and Restoration',
    focus: 'Digestion and the gut lining',
    blurb: 'For bloating, irregularity and the sense that food no longer sits well. Built around repairing the lining rather than managing symptoms.',
    weeks: '8 weeks',
    html: require('../assets/programs/gut-healing.html'),
  },
  {
    id: 't2d-metabolic',
    title: 'Type 2 Diabetes and Prediabetes',
    focus: 'Blood sugar and metabolic health',
    blurb: 'A structured approach to insulin sensitivity through fasting, food and targeted support. Written to be read alongside your doctor, not instead of them.',
    weeks: '12 weeks',
    html: require('../assets/programs/t2d-metabolic.html'),
  },
  {
    id: 'muscle-insulin',
    title: 'Muscle Gain with Insulin Resistance',
    focus: 'Building muscle when metabolism resists',
    blurb: 'For anyone who trains hard and sees little for it. Addresses the metabolic reason muscle will not build before addressing the training.',
    weeks: '12 weeks',
    html: require('../assets/programs/muscle-insulin.html'),
  },
  {
    id: 'muscle-mass',
    title: 'Muscle Mass and Regeneration',
    focus: 'Strength and recovery',
    blurb: 'Growth and repair together, for people who want to build rather than simply maintain. Training, protein timing and recovery treated as one thing.',
    weeks: '12 weeks',
    html: require('../assets/programs/muscle-mass.html'),
  },
  {
    id: 'male-health',
    title: 'Comprehensive Male Health',
    focus: 'Hormones, energy and vitality',
    blurb: 'Energy, drive, sleep and body composition looked at as one system rather than separate complaints. Includes what to test and what the numbers mean.',
    weeks: '12 weeks',
    html: require('../assets/programs/male-health.html'),
  },
  {
    id: 'ovarian-longevity',
    title: 'Ovarian Longevity Support',
    focus: 'Hormonal balance and reserve',
    blurb: 'Support for hormonal rhythm and ovarian health across the years it matters most. Gentle, specific, and clear about what it does not claim.',
    weeks: '12 weeks',
    html: require('../assets/programs/ovarian-longevity.html'),
  },
];

// Spelled out to twelve, since Eight protocols reads better than 8 protocols
// in a serif. A digit after that, where a word starts to look laboured.
const COUNT_WORDS = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six',
  'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
];

export function programCountWord(): string {
  const n = HEALTH_PROGRAMS.length;
  return COUNT_WORDS[n] ?? String(n);
}

export function healthProgram(id?: string): HealthProgram | null {
  return id ? HEALTH_PROGRAMS.find((p) => p.id === id) ?? null : null;
}
