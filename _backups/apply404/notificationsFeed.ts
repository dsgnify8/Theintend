// The in-app notification list. Everything here is derived from bookings and
// packages, so it always reflects what is actually booked. Nothing is stored
// except which items have been seen, and that lives on the device.
//
// Item ids are deliberately stateful. A package item carries its used count, so
// using another session produces a new id and therefore a new unread item.
import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bookingStartMs, useMyBookings } from './bookings';
import { useMyPackages } from './packages';
import { useAuth } from './auth';

export const NOTIFS_SEEN_KEY = 'intend.notifs.seen.v1';
const SEEN_CAP = 200;

export type FeedItem = {
  id: string;
  icon: string;
  title: string;
  body: string;
  route: string;
  at: number | null;
};

function bookingRoute(b: any): string {
  if (b.kind === 'program') return `/program/${b.ref_id}`;
  if (b.kind === 'class') return `/class/${b.ref_id}`;
  return b.expert_id ? `/expert/${b.expert_id}` : '/sessions';
}

export function useNotificationFeed() {
  const { role } = useAuth();
  const { items: bookings, reload: reloadBookings } = useMyBookings();
  const { items: packages, reload: reloadPackages } = useMyPackages();
  const [seen, setSeen] = useState<string[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      let list: string[] = [];
      try {
        const raw = await AsyncStorage.getItem(NOTIFS_SEEN_KEY);
        if (raw) list = JSON.parse(raw);
      } catch {}
      if (alive) setSeen(Array.isArray(list) ? list : []);
    })();
    return () => { alive = false; };
  }, []);

  const items = useMemo<FeedItem[]>(() => {
    const out: FeedItem[] = [];
    const now = Date.now();

    if (role === 'expert' || role === 'admin') {
      const expert = role === 'expert';
      out.push({
        id: `role:guide:${role}`,
        icon: expert ? 'briefcase-outline' : 'grid-outline',
        title: expert ? 'You are now an expert' : 'You are now an admin',
        body: expert
          ? 'Your panel is ready. Tap here for a walk through what is in it.'
          : 'Your panel is ready. Tap here for a walk through what is in it.',
        route: expert ? '/expert-panel?tour=1' : '/admin?tour=1',
      });
    }

    // Sessions still ahead of us, soonest first.
    const upcoming = bookings
      .map((b: any) => ({ b, t: bookingStartMs(b) }))
      .filter((x) => x.t != null && (x.t as number) >= now - 3600000)
      .sort((a, c) => (a.t as number) - (c.t as number))
      .slice(0, 6);

    for (const { b, t } of upcoming) {
      out.push({
        id: `booking:${b.id}`,
        icon: 'calendar-outline',
        title: b.title,
        body: b.expert_name ? `${b.when_text} with ${b.expert_name}` : b.when_text,
        route: bookingRoute(b),
        at: t as number,
      });
    }

    // Packages with sessions still to book.
    for (const p of packages as any[]) {
      const used = p.used ?? 0;
      const total = p.total ?? 0;
      if (total <= 0 || used >= total) continue;
      const left = total - used;
      const next = used + 1;
      out.push({
        id: `package:${p.id}:${used}`,
        icon: 'albums-outline',
        title: p.title,
        body: `You have used ${used} of ${total}. Book session ${next}${p.expert_name ? ` with ${p.expert_name}` : ''}.`,
        route: p.expert_id ? `/book/${p.expert_id}` : '/experts',
        at: null,
      });
    }

    return out;
  }, [bookings, packages, role]);

  const unread = useMemo(() => {
    if (seen === null) return 0;
    const s = new Set(seen);
    return items.filter((i) => !s.has(i.id)).length;
  }, [items, seen]);

  const markAllSeen = useCallback(() => {
    const ids = items.map((i) => i.id);
    setSeen((prev) => {
      const merged = Array.from(new Set([...(prev ?? []), ...ids])).slice(-SEEN_CAP);
      AsyncStorage.setItem(NOTIFS_SEEN_KEY, JSON.stringify(merged)).catch(() => {});
      return merged;
    });
  }, [items]);

  const reload = useCallback(() => {
    reloadBookings();
    reloadPackages();
  }, [reloadBookings, reloadPackages]);

  return { items, unread, ready: seen !== null, markAllSeen, reload };
}
