// Changing or removing an event that already exists.
//
// One function for both, so the auth check and the token refresh only have to
// be right in one place. Follows the same shape as calendar-busy.
import { corsHeaders, json } from '../_shared/cors.ts';
import { getUser, getValidAccessToken } from '../_shared/google.ts';

const BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Not signed in' }, 401);

    const { expertId, eventId, action, startIso, endIso, summary } = await req.json();
    if (!expertId || !eventId || !action) {
      return json({ error: 'Missing expertId, eventId or action' }, 400);
    }
    if (action !== 'update' && action !== 'delete') {
      return json({ error: 'action must be update or delete' }, 400);
    }

    const token = await getValidAccessToken(expertId);
    // No calendar connected, so there is nothing to change and nothing wrong.
    if (!token) return json({ connected: false, done: false });

    const url = `${BASE}/${encodeURIComponent(eventId)}`;

    if (action === 'delete') {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      // Already gone is the outcome we wanted. An expert who deleted it by
      // hand should not produce an error here.
      if (res.ok || res.status === 404 || res.status === 410) {
        return json({ connected: true, done: true });
      }
      const body = await res.text();
      return json({ connected: true, done: false, error: `google ${res.status}: ${body.slice(0, 200)}` }, 502);
    }

    const patch: Record<string, unknown> = {};
    if (startIso) patch.start = { dateTime: startIso };
    if (endIso) patch.end = { dateTime: endIso };
    if (summary) patch.summary = summary;
    if (!Object.keys(patch).length) return json({ error: 'Nothing to change' }, 400);

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const body = await res.text();
      return json({ connected: true, done: false, error: `google ${res.status}: ${body.slice(0, 200)}` }, 502);
    }

    const ev = await res.json();
    return json({ connected: true, done: true, eventId: ev?.id ?? eventId });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
