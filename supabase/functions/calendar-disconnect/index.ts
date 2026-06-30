import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, getUser } from '../_shared/google.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Not signed in' }, 401);
    const { expertId } = await req.json();
    await adminClient().from('calendar_connections').delete().eq('expert_id', expertId);
    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
