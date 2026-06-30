import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// Returns a valid access token for an expert, refreshing it if expired.
export async function getValidAccessToken(expertId: string): Promise<string | null> {
  const admin = adminClient();
  const { data: conn } = await admin
    .from('calendar_connections')
    .select('*')
    .eq('expert_id', expertId)
    .maybeSingle();
  if (!conn) return null;

  const expiringSoon =
    !conn.token_expiry || new Date(conn.token_expiry).getTime() < Date.now() + 60_000;
  if (!expiringSoon) return conn.access_token;
  if (!conn.refresh_token) return conn.access_token;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: conn.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const tok = await res.json();
  if (!tok.access_token) return conn.access_token;

  const expiry = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
  await admin
    .from('calendar_connections')
    .update({ access_token: tok.access_token, token_expiry: expiry })
    .eq('expert_id', expertId);
  return tok.access_token;
}

// Verifies the Supabase JWT on the request and returns the user (or null).
export async function getUser(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
