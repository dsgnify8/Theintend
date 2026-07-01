// Each expert's OWN share (percent they keep). Online vs in-person can differ.
// The platform cut is simply (100 - share) and is never shown to the expert.

export type Split = { online: number; inPerson: number };
export type SplitException = { label: string; expertShare: number };

export const EXPERT_SPLITS: Record<string, Split> = {
  'omar-chtioui': { online: 80, inPerson: 80 },
  'alevtina-buzynarska': { online: 70, inPerson: 80 },
  'zahra-gozal': { online: 70, inPerson: 80 },
  'ekaterina-murray': { online: 70, inPerson: 70 },
  'irina-goldenberg': { online: 70, inPerson: 70 },
  'scheherazade-hasan': { online: 70, inPerson: 70 },
  'joanna-gudkina': { online: 85, inPerson: 85 },
};

// Per-service overrides (expert keeps a different share for specific offerings).
export const SPLIT_EXCEPTIONS: Record<string, SplitException[]> = {
  'joanna-gudkina': [{ label: 'AtlasPROfilax — one-time session', expertShare: 95 }],
};

export const DEFAULT_SPLIT: Split = { online: 70, inPerson: 70 };

export function splitFor(expertId: string): Split {
  return EXPERT_SPLITS[expertId] ?? DEFAULT_SPLIT;
}

export function exceptionsFor(expertId: string): SplitException[] {
  return SPLIT_EXCEPTIONS[expertId] ?? [];
}

