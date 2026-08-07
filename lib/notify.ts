// The only thing that sends a notification.
//
// It writes the row and sends the push according to constants/notifications,
// so what is kept and what is pushed can never drift apart. Nothing else
// should call sendPushTo directly.
import { supabase } from './supabase';
import { sendPushTo, sendPushToEmail } from './notifications';
import { goesInApp, goesToPush, type NotifKind } from '@/constants/notifications';

export type NotifyInput = {
  kind: NotifKind;
  title: string;
  body: string;
  // Where tapping it goes. Nothing happens on tap if this is left out.
  route?: string;
  data?: Record<string, any>;
  // One of these. An email is looked up, which is why sending to a user id is
  // cheaper where you have one.
  userId?: string;
  email?: string;
};

async function userIdForEmail(email: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();
    return (data as any)?.id ?? null;
  } catch {
    return null;
  }
}

// Best effort throughout. A notification that fails must never take down the
// thing that caused it, because the booking or the payout matters more.
export async function notify(input: NotifyInput): Promise<void> {
  const { kind, title, body, route, data, email } = input;
  let userId = input.userId ?? null;

  try {
    if (goesInApp(kind)) {
      if (!userId && email) userId = await userIdForEmail(email);
      if (userId) {
        await supabase.from('notifications').insert({
          user_id: userId,
          kind,
          title,
          body,
          route: route ?? null,
          data: data ?? {},
        });
      }
    }
  } catch {}

  try {
    if (goesToPush(kind)) {
      const payload = { ...(data ?? {}), route: route ?? null, kind };
      if (userId) await sendPushTo(userId, title, body, payload);
      else if (email) await sendPushToEmail(email, title, body, payload);
    }
  } catch {}
}

export type StoredNotif = {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  route: string | null;
  read_at: string | null;
  created_at: string;
};

export async function fetchStoredNotifs(): Promise<StoredNotif[]> {
  try {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return [];
    const { data } = await supabase
      .from('notifications')
      .select('id,kind,title,body,route,read_at,created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);
    return (data as StoredNotif[]) ?? [];
  } catch {
    return [];
  }
}

export async function markStoredSeen(ids: string[]): Promise<void> {
  if (!ids.length) return;
  try {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)
      .is('read_at', null);
  } catch {}
}
