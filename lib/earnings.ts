// What an expert will be paid. Prices come from the services table, the share
// from constants/splits, and the online or in-person question from the booking
// itself rather than the service, because a service can be offered both ways
// while the two rates differ.
//
// Nothing here exposes the platform's share. The expert screen shows only the
// amount going to the expert.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { shareFor } from '@/constants/splits';

export type ServiceRow = {
  id: string;
  price: string | null;
  online: boolean | null;
  in_person: boolean | null;
  kind: string | null;
  sessions_total: number | null;
};

export type EarningLine = {
  bookingId: string;
  title: string;
  payout: number | null;
  sharePct: number | null;
  note: string | null;
};

// Prices are written several ways ("700 AED", "AED 3,100", "3,150 AED"), and
// whole amounts only, so stripping to digits is safe. "Free" yields 0.
export function priceToAed(price: string | null | undefined): number {
  const digits = (price || '').replace(/[^0-9]/g, '');
  return parseInt(digits || '0', 10);
}

export async function getServicesFor(expertId: string): Promise<Record<string, ServiceRow>> {
  try {
    const { data } = await supabase
      .from('services')
      .select('id,price,online,in_person,kind,sessions_total')
      .eq('expert_id', expertId);
    const map: Record<string, ServiceRow> = {};
    for (const r of (data as ServiceRow[]) ?? []) map[r.id] = r;
    return map;
  } catch {
    return {};
  }
}

// The client picked online or in person at checkout and it went into the title.
// Only when the title says nothing do the service flags decide, and then only
// where the service is unambiguous.
export function wasInPerson(title: string | null | undefined, svc?: ServiceRow): boolean {
  if (title && /in person/i.test(title)) return true;
  if (title && /online/i.test(title)) return false;
  if (svc && svc.in_person && !svc.online) return true;
  return false;
}

export function lineFor(booking: any, expertId: string, services: Record<string, ServiceRow>): EarningLine {
  const svc = booking?.service_id ? services[booking.service_id] : undefined;

  // A package is paid once. The payout sits on the first session so the total
  // is not counted once per session.
  if (booking?.package_id && (booking?.session_no ?? 1) > 1) {
    return { bookingId: booking.id, title: booking.title, payout: null, sharePct: null, note: 'Part of a package' };
  }
  if (!svc) {
    return { bookingId: booking.id, title: booking.title, payout: null, sharePct: null, note: 'No amount recorded' };
  }

  const gross = priceToAed(svc.price);
  if (gross <= 0) {
    return { bookingId: booking.id, title: booking.title, payout: 0, sharePct: null, note: 'Free session' };
  }

  const pct = shareFor(expertId, booking.service_id, wasInPerson(booking.title, svc));
  return {
    bookingId: booking.id,
    title: booking.title,
    payout: Math.round((gross * pct) / 100),
    sharePct: pct,
    note: null,
  };
}

export function useExpertEarnings(expertId: string | undefined, bookings: any[]) {
  const [services, setServices] = useState<Record<string, ServiceRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!expertId) { setServices({}); setLoading(false); return; }
    setLoading(true);
    getServicesFor(expertId)
      .then((m) => { if (alive) { setServices(m); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [expertId]);

  const lines = expertId ? bookings.map((b) => lineFor(b, expertId, services)) : [];
  const total = lines.reduce((sum, l) => sum + (l.payout ?? 0), 0);
  const priced = lines.filter((l) => l.payout != null).length;

  return { lines, total, priced, loading };
}

export function aed(n: number): string {
  return n.toLocaleString('en-US') + ' AED';
}
