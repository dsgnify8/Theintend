import { corsHeaders, json } from '../_shared/cors.ts';
import { getUser, getValidAccessToken } from '../_shared/google.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Not signed in' }, 401);

    const { expertId, timeMin, timeMax } = await req.json();
    const token = await getValidAccessToken(expertId);
    if (!token) return json({ connected: false, busy: [] });

    const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeMin, timeMax, items: [{ id: 'primary' }] }),
    });
    const data = await res.json();
    const busy = data?.calendars?.primary?.busy ?? [];
    return json({ connected: true, busy });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
