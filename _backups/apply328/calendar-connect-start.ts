import { corsHeaders, json } from '../_shared/cors.ts';
import { getUser } from '../_shared/google.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Not signed in' }, 401);

    const { expertId, appReturnUrl } = await req.json();
    if (!expertId || !appReturnUrl) return json({ error: 'Missing expertId or appReturnUrl' }, 400);

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI')!;
    const scope = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ');
    const state = btoa(JSON.stringify({ expertId, appReturnUrl }));

    const url =
      'https://accounts.google.com/o/oauth2/v2/auth' +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      '&response_type=code&access_type=offline&prompt=consent&include_granted_scopes=true' +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${encodeURIComponent(state)}`;

    return json({ url });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
