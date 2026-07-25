// Real Stripe payments via the native payment sheet. Amount is in the smallest
// currency unit (fils for AED, so AED * 100).
import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import { supabase } from './supabase';

export function priceToMinorUnits(price: string): number {
  const digits = (price || '').replace(/[^0-9]/g, '');
  const whole = parseInt(digits || '0', 10);
  return whole * 100;
}

export async function payWithSheet(opts: { amount: number; currency?: string; label: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-payment', {
      body: { amount: opts.amount, currency: opts.currency ?? 'aed', label: opts.label },
    });
    if (error) return { ok: false, error: error.message || 'Could not start payment.' };
    if (!data?.paymentIntent) return { ok: false, error: 'Could not start payment.' };

    const init = await initPaymentSheet({
      merchantDisplayName: 'The Intend',
      paymentIntentClientSecret: data.paymentIntent,
      customerId: data.customer ?? undefined,
      customerEphemeralKeySecret: data.ephemeralKey ?? undefined,
      allowsDelayedPaymentMethods: false,
      returnURL: 'theintend://stripe-redirect',
      applePay: { merchantCountryCode: 'AE' },
      googlePay: { merchantCountryCode: 'AE', testEnv: true },
    });
    if (init.error) return { ok: false, error: init.error.message };

    const res = await presentPaymentSheet();
    if (res.error) {
      const canceled = res.error.code === 'Canceled';
      return { ok: false, error: canceled ? 'canceled' : (res.error.message || 'Payment failed.') };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Payment failed.' };
  }
}
