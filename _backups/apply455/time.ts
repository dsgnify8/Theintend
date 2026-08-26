// Locale-aware clock formatting, shared across screens so what the expert sets
// and what the client sees always read the same way. 24-hour for regions that
// use it (most of Europe, Asia), 12-hour AM/PM elsewhere.
//
// The check is done once and cached, since Intl calls are not free and the
// device locale does not change mid-session.

let cached: boolean | null = null;

export function is24Hour(): boolean {
  if (cached !== null) return cached;
  try {
    const s = new Date(2020, 0, 1, 13, 0).toLocaleTimeString();
    cached = !/[AP]M/i.test(s);
  } catch {
    cached = false;
  }
  return cached;
}

// Hours 0-23 and minutes 0-59 to a clock string. "14:00" or "2:00 PM"
// depending on where you are.
export function formatClock(h: number, m: number): string {
  const mm = m < 10 ? '0' + m : String(m);
  if (is24Hour()) {
    const hh = h < 10 ? '0' + h : String(h);
    return hh + ':' + mm;
  }
  const hh = ((h + 11) % 12) + 1;
  return hh + ':' + mm + ' ' + (h < 12 ? 'AM' : 'PM');
}

// The same, for a specific timezone. Used when the expert reads a client's
// time and needs to see what the client's clock says.
export function formatClockInZone(iso: string, zone: string): string | null {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric', minute: '2-digit', hour12: !is24Hour(), timeZone: zone,
    }).format(d);
  } catch {
    return null;
  }
}
