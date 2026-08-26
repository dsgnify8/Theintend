// Locale-aware clock formatting, shared across screens so what the expert sets
// and what the client sees always read the same way.
//
// Detection order on iOS:
//   1) The explicit "24-Hour Time" toggle in Settings > General > Date & Time.
//      Users who want military time regardless of language leave it on; those
//      who want AM/PM regardless leave it off.
//   2) The effective region-aware locale (e.g. en_SE, English-in-Sweden, reads
//      as 24-hour even though the language is English).
//   3) The device default.
//
// Cached after first read since the OS setting cannot change mid-session.

import { NativeModules, Platform } from 'react-native';

let cached: boolean | null = null;

function detect(): boolean {
  if (Platform.OS === 'ios') {
    const settings: any = NativeModules.SettingsManager?.settings;
    const forced = settings?.AppleICUForce24HourTime;
    if (typeof forced === 'boolean') return forced;
    const raw = settings?.AppleLocale || (Array.isArray(settings?.AppleLanguages) ? settings.AppleLanguages[0] : null);
    if (raw) {
      try {
        const s = new Date(2020, 0, 1, 13, 0).toLocaleTimeString(String(raw).replace('_', '-'));
        return !/[AP]M/i.test(s);
      } catch {}
    }
  }
  try {
    const s = new Date(2020, 0, 1, 13, 0).toLocaleTimeString();
    return !/[AP]M/i.test(s);
  } catch {
    return false;
  }
}

export function is24Hour(): boolean {
  if (cached === null) cached = detect();
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
