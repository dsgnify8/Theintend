export type WorksheetMeta = {
  id: string;
  title: string;
  subtitle: string;
  blurb: string;
  minutes: string;
};

export const WORKSHEETS: WorksheetMeta[] = [
  {
    id: 'purpose-audit',
    title: 'The Purpose Audit',
    subtitle: 'Find, live and refine your life purpose',
    blurb: 'A short guided book that moves you through three questions: what your purpose is, how to work toward it, and how to stay aligned to it over time.',
    minutes: '20 to 30 min',
  },
];

export function getWorksheet(id: string): WorksheetMeta | null {
  return WORKSHEETS.find((w) => w.id === id) ?? null;
}
