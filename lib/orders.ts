// Order bookkeeping for paid bookings. An order row is written before the
// customer is charged and updated as the flow progresses, so a charge always
// has a record even if something fails before the booking is written.
// Every function here is best effort: it swallows its own errors and must
// never block or fail a booking.
import { supabase } from './supabase';

export type OrderInput = {
  provider: 'stripe' | 'tabby';
  amountMinor: number;
  currency?: string;
  kind: 'single' | 'package';
  expertId?: string | null;
  serviceId?: string | null;
  label: string;
  intendedStart?: Date | null;
  intendedTz?: string | null;
};

export async function createOrder(input: OrderInput): Promise<string | null> {
  try {
    const { data: u } = await supabase.auth.getUser();
    const userId = u?.user?.id ?? null;
    const email = u?.user?.email ?? null;
    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        email,
        source: 'app',
        provider: input.provider,
        status: 'started',
        amount_minor: input.amountMinor,
        currency: (input.currency ?? 'aed').toLowerCase(),
        kind: input.kind,
        expert_id: input.expertId ?? null,
        service_id: input.serviceId ?? null,
        label: input.label,
        intended_start: input.intendedStart ? input.intendedStart.toISOString() : null,
        intended_tz: input.intendedTz ?? null,
      })
      .select('id')
      .maybeSingle();
    if (error) return null;
    return (data as any)?.id ?? null;
  } catch {
    return null;
  }
}

export async function markOrderPaid(id: string | null, providerRef?: string | null) {
  if (!id) return;
  try {
    await supabase
      .from('orders')
      .update({ status: 'paid', provider_ref: providerRef ?? null, updated_at: new Date().toISOString() })
      .eq('id', id);
  } catch {}
}

export async function markOrderFulfilled(
  id: string | null,
  opts?: { bookingId?: string | null; packageId?: string | null }
) {
  if (!id) return;
  try {
    await supabase
      .from('orders')
      .update({
        status: 'fulfilled',
        booking_id: opts?.bookingId ?? null,
        package_id: opts?.packageId ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
  } catch {}
}

export async function markOrderFailed(id: string | null, error?: string | null) {
  if (!id) return;
  try {
    await supabase
      .from('orders')
      .update({ status: 'failed', error: error ?? null, updated_at: new Date().toISOString() })
      .eq('id', id);
  } catch {}
}
