// Tabby (pay in 4). Creates a session on the server, opens Tabby's hosted
// checkout, then verifies + captures server-side. Amount is a major-unit string.
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

export function priceToMajorString(price: string): string {
  const digits = (price || '').replace(/[^0-9]/g, '');
  const whole = parseInt(digits || '0', 10);
  return whole.toFixed(2);
}

export function tabbyInstallment(price: string): string {
  const digits = (price || '').replace(/[^0-9]/g, '');
  const whole = parseInt(digits || '0', 10);
  if (whole <= 0) return '';
  return Math.round(whole / 4).toLocaleString('en-US') + ' AED';
}

export async function payWithTabby(opts: { amount: string; label: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const create = await supabase.functions.invoke('tabby', {
      body: { action: 'create', amount: opts.amount, currency: 'aed', label: opts.label },
    });
    if (create.error) return { ok: false, error: create.error.message };
    if (create.data?.rejected) return { ok: false, error: 'Tabby is not available for this purchase.' };
    const webUrl = create.data?.webUrl;
    const paymentId = create.data?.paymentId;
    if (!webUrl || !paymentId) return { ok: false, error: 'Could not start Tabby.' };

    const result = await WebBrowser.openAuthSessionAsync(webUrl, 'theintend://tabby-return');
    if (result.type !== 'success') return { ok: false, error: 'canceled' };

    const cap = await supabase.functions.invoke('tabby', { body: { action: 'capture', paymentId } });
    if (cap.error || !cap.data?.ok) return { ok: false, error: cap.data?.error || 'Tabby payment was not completed.' };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Tabby payment failed.' };
  }
}
