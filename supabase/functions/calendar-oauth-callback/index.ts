import { adminClient } from '../_shared/google.ts';

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state');
  if (!code || !state) return new Response('Missing code or state', { status: 400 });

  let parsed: { expertId: string; appReturnUrl: string };
  try {
    parsed = JSON.parse(atob(state));
  } catch {
    return new Response('Bad state', { status: 400 });
  }
  const { expertId, appReturnUrl } = parsed;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      redirect_uri: Deno.env.get('GOOGLE_REDIRECT_URI')!,
      grant_type: 'authorization_code',
    }),
  });
  const tok = await tokenRes.json();
  if (!tok.access_token) {
    return new Response('Token exchange failed: ' + JSON.stringify(tok), { status: 400 });
  }

  const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  });
  const info = await infoRes.json();

  const admin = adminClient();
  const expiry = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
  const row: Record<string, unknown> = {
    expert_id: expertId,
    provider: 'google',
    google_email: info.email ?? null,
    access_token: tok.access_token,
    token_expiry: expiry,
    connected_at: new Date().toISOString(),
  };
  // Only overwrite the refresh token when Google sends a new one.
  if (tok.refresh_token) row.refresh_token = tok.refresh_token;
  await admin.from('calendar_connections').upsert(row);

  const sep = appReturnUrl.includes('?') ? '&' : '?';
  return new Response(null, {
    status: 302,
    headers: { Location: `${appReturnUrl}${sep}status=connected` },
  });
});
