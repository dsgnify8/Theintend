// Every kind of notification, and how each one travels.
//
// inapp   sits in the bell, nothing on the lock screen
// push    lock screen only, nothing kept
// both    kept and pushed
//
// Change a line here and that is the whole change. Nothing else needs editing.

export type NotifKind =
  | 'booking_new'
  | 'booking_cancelled'
  | 'booking_moved'
  | 'reschedule_needed'
  | 'payout_sent'
  | 'submission_approved'
  | 'submission_rejected'
  | 'role_granted'
  | 'program_bought'
  | 'session_reminder';

export type Channel = 'inapp' | 'push' | 'both';

export const NOTIF_CHANNEL: Record<NotifKind, Channel> = {
  // Someone booked an expert. They need to know now, and to find it later.
  booking_new: 'both',

  // Their session is not happening. The most important one we send.
  booking_cancelled: 'both',

  // A time changed. Worth interrupting for, and worth keeping.
  booking_moved: 'both',

  // An expert cannot make a time and the client has to pick another.
  reschedule_needed: 'both',

  // Money has been sent. Not urgent, but they will want the record.
  payout_sent: 'both',

  // Their offering is live. Pleasant rather than urgent.
  submission_approved: 'both',

  // Not yet, with a reason. Kept, because the reason matters and a push
  // disappears.
  submission_rejected: 'inapp',

  // You are now an expert. Stays in the bell so they can find the panel again.
  role_granted: 'both',

  // Someone bought a program. For the expert whose programs they are.
  program_bought: 'inapp',

  // A session is soon. Interrupting is the point, and it is already in their
  // list, so there is nothing to keep.
  session_reminder: 'push',
};

export function goesInApp(kind: NotifKind): boolean {
  const c = NOTIF_CHANNEL[kind];
  return c === 'inapp' || c === 'both';
}

export function goesToPush(kind: NotifKind): boolean {
  const c = NOTIF_CHANNEL[kind];
  return c === 'push' || c === 'both';
}

// What the bell shows against each kind.
export const NOTIF_ICON: Record<NotifKind, string> = {
  booking_new: 'calendar-outline',
  booking_cancelled: 'close-circle-outline',
  booking_moved: 'swap-horizontal-outline',
  reschedule_needed: 'time-outline',
  payout_sent: 'cash-outline',
  submission_approved: 'checkmark-circle-outline',
  submission_rejected: 'information-circle-outline',
  role_granted: 'key-outline',
  program_bought: 'sparkles-outline',
  session_reminder: 'alarm-outline',
};
