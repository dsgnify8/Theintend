// tabby-webhook: receives Tabby payment events.
// Contract with Tabby: always answer 200 on receipt, never 400, and do the work
// after. A non-200 makes Tabby retry and then drop the event.
// Deploy with:  supabase functions deploy tabby-webhook --no-verify-jwt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ok = () =>
  new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return ok();

  // Read the body defensively: a malformed payload must still get a 200.
  let event: any = null;
  try {
    event = await req.json();
  } catch {
    return ok();
  }

  try {
    const paymentId = event?.id ?? event?.payment?.id ?? null;
    const status = event?.status ?? event?.payment?.status ?? null;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    await admin.from('tabby_events').insert({
      payment_id: paymentId,
      status,
      payload: event,
    });
  } catch (e) {
    // Swallow: Tabby must still see a 200 or it will retry and drop the event.
    console.error('tabby-webhook store failed', String((e as any)?.message ?? e));
  }

  return ok();
});
