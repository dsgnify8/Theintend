// Each expert's OWN share (percent they keep). Online vs in-person can differ.
// The platform cut is simply (100 - share) and is never shown to the expert.

export type Split = { online: number; inPerson: number };
// serviceId is what the rate is actually matched on. The label is only for
// showing the exception to an admin.
export type SplitException = { serviceId: string; label: string; expertShare: number };

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
  'joanna-gudkina': [
    { serviceId: 'joanna-gudkina-atlasprofilax', label: 'AtlasPROfilax, one-time session', expertShare: 95 },
  ],
};

export const DEFAULT_SPLIT: Split = { online: 70, inPerson: 70 };

export function splitFor(expertId: string): Split {
  return EXPERT_SPLITS[expertId] ?? DEFAULT_SPLIT;
}

export function exceptionsFor(expertId: string): SplitException[] {
  return SPLIT_EXCEPTIONS[expertId] ?? [];
}

// Every override, keyed by the service it applies to.
const BY_SERVICE: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  for (const list of Object.values(SPLIT_EXCEPTIONS)) {
    for (const ex of list) out[ex.serviceId] = ex.expertShare;
  }
  return out;
})();

// The share this expert keeps on one booking. A service override wins over the
// expert's standard rate. Otherwise it comes down to how the session was
// delivered, since online and in-person can differ.
export function shareFor(expertId: string, serviceId: string | null | undefined, inPerson: boolean): number {
  if (serviceId && typeof BY_SERVICE[serviceId] === 'number') return BY_SERVICE[serviceId];
  const s = splitFor(expertId);
  return inPerson ? s.inPerson : s.online;
}

