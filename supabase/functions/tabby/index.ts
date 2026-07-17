// Supabase Edge Function: tabby
// action 'create'  -> creates a Tabby checkout session, returns { webUrl, paymentId } or { rejected }
// action 'capture' -> verifies the payment and captures it, returns { ok }
// Secret + public keys live only here.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TABBY_API = 'https://api.tabby.ai/api/v2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const action = body.action;
    const pub = Deno.env.get('TABBY_PUBLIC_KEY')!;
    const sec = Deno.env.get('TABBY_SECRET_KEY')!;
    const merchant = Deno.env.get('TABBY_MERCHANT_CODE') || 'TheIntend';

    // Buyer details from the signed-in user (email always; phone/name if on file).
    let email: string | undefined;
    let phone: string | undefined;
    let name: string | undefined;
    let registeredSince: string | undefined;
    let loyaltyLevel = 0;
    try {
      const authHeader = req.headers.get('Authorization') || '';
      if (authHeader) {
        const uc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data } = await uc.auth.getUser();
        email = data?.user?.email ?? undefined;
        // Tabby wants the real sign-up date, not the moment of checkout.
        registeredSince = data?.user?.created_at ?? undefined;
        if (data?.user?.id) {
          const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
          const { data: p } = await admin.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
          name = (p as any)?.full_name ?? undefined;
          phone = (p as any)?.phone ?? undefined;
          // loyalty_level = how many orders this customer has completed before.
          const { count } = await admin
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', data.user.id);
          loyaltyLevel = count ?? 0;
        }
      }
    } catch { /* guest */ }

    if (action === 'create') {
      // Never fall back to Tabby's test buyer on live keys: a real payment
      // must carry the real customer's identity, and Tabby scores on it.
      if (!email) return json({ code: 'sign_in_required', error: 'Please sign in to pay with Tabby.' }, 401);
      if (!phone) return json({ code: 'phone_required', error: 'Add your phone number in Personal information to pay with Tabby.' }, 400);
      const amount = String(body.amount);
      const currency = (body.currency || 'AED').toUpperCase();
      const ref = 'intend-' + Date.now();
      const payload = {
        payment: {
          amount,
          currency,
          description: body.label || 'The Intend',
          buyer: {
            email,
            phone,
            name: name || 'Customer',
          },
          order: {
            reference_id: ref,
            items: [{
              title: body.label || 'The Intend',
              quantity: 1,
              unit_price: amount,
              reference_id: ref,
              category: body.category || 'Services',
            }],
          },
          buyer_history: {
            registered_since: registeredSince || new Date().toISOString(),
            loyalty_level: loyaltyLevel,
          },
        },
        lang: 'en',
        merchant_code: merchant,
        merchant_urls: {
          success: 'theintend://tabby-return?status=success',
          cancel: 'theintend://tabby-return?status=cancel',
          failure: 'theintend://tabby-return?status=failure',
        },
      };
      const r = await fetch(TABBY_API + '/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + pub },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (data.status === 'rejected') return json({ rejected: true });
      const webUrl = data?.configuration?.available_products?.installments?.[0]?.web_url;
      const paymentId = data?.payment?.id;
      if (!webUrl || !paymentId) return json({ error: 'Tabby session not created', detail: data }, 400);
      return json({ webUrl, paymentId });
    }

    if (action === 'capture') {
      const paymentId = body.paymentId;
      const g = await fetch(TABBY_API + '/payments/' + paymentId, { headers: { Authorization: 'Bearer ' + sec } });
      const pay = await g.json();
      if (pay.status === 'CLOSED') return json({ ok: true });
      if (pay.status === 'AUTHORIZED') {
        const cap = await fetch(TABBY_API + '/payments/' + paymentId + '/captures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sec },
          body: JSON.stringify({ amount: pay.amount, reference_id: pay.order?.reference_id }),
        });
        if (cap.ok) return json({ ok: true });
        return json({ ok: false, error: 'capture failed' });
      }
      return json({ ok: false, error: pay.status || 'not authorized' });
    }

    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});