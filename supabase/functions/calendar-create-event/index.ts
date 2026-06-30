import { corsHeaders, json } from '../_shared/cors.ts';
import { getUser, getValidAccessToken } from '../_shared/google.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Not signed in' }, 401);

    const { expertId, summary, description, startIso, endIso, attendeeEmail } = await req.json();
    const token = await getValidAccessToken(expertId);
    if (!token) return json({ connected: false });

    const event: Record<string, unknown> = {
      summary,
      description,
      start: { dateTime: startIso },
      end: { dateTime: endIso },
    };
    if (attendeeEmail) event.attendees = [{ email: attendeeEmail }];

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    const data = await res.json();
    return json({ connected: true, eventId: data.id ?? null });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
