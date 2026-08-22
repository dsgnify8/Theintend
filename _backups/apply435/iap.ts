// Apple's side of buying a program.
//
// Written against expo-iap 5.0.1. The one thing worth knowing: the call to buy
// is not what confirms a purchase. Apple delivers it to a listener, possibly
// much later, possibly on next launch, possibly from another device the person
// already bought on. So everything is recorded from the listener rather than
// from the button, and restoring needs no separate path because a restored
// purchase arrives the same way.
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
} from 'expo-iap';
import { ALL_PRODUCT_IDS, programIdForProduct } from '@/constants/healthPrograms';

let started = false;
let subs: { remove: () => void }[] = [];

export type IapProduct = { id: string; price: string | null; title: string | null };
let catalogue: Record<string, IapProduct> = {};

// Called once when a purchase completes, wherever it came from.
type OnOwned = (programId: string) => Promise<void> | void;
let onOwned: OnOwned | null = null;

export function setPurchaseHandler(fn: OnOwned) {
  onOwned = fn;
}

export async function startIap(): Promise<boolean> {
  if (started) return true;
  try {
    await initConnection();

    subs.push(
      purchaseUpdatedListener(async (purchase: any) => {
        const productId = purchase?.productId ?? purchase?.id;
        const programId = productId ? programIdForProduct(String(productId)) : null;
        if (!programId) return;
        try {
          // Recorded before the transaction is finished. If this throws, Apple
          // keeps redelivering until it works, which is what we want.
          await onOwned?.(programId);
          await finishTransaction({ purchase, isConsumable: false });
        } catch {
          // Left unfinished on purpose. It will come back.
        }
      }),
    );

    subs.push(
      purchaseErrorListener(() => {
        // Cancelling is the common case and is not worth surfacing.
      }),
    );

    try {
      const list: any = await fetchProducts({ skus: ALL_PRODUCT_IDS, type: 'in-app' });
      const arr = Array.isArray(list) ? list : (list?.products ?? []);
      catalogue = {};
      for (const pr of arr as any[]) {
        const id = pr?.id ?? pr?.productId;
        if (!id) continue;
        catalogue[String(id)] = {
          id: String(id),
          price: pr?.displayPrice ?? pr?.localizedPrice ?? null,
          title: pr?.title ?? null,
        };
      }
    } catch {
      // No catalogue means the app still runs, it just shows our own price.
    }

    started = true;
    return true;
  } catch {
    return false;
  }
}

export async function stopIap() {
  subs.forEach((s) => { try { s.remove(); } catch {} });
  subs = [];
  started = false;
  try { await endConnection(); } catch {}
}

// Apple's price for a product, so the person sees their own currency rather
// than ours. Null until the catalogue has loaded.
export function priceFor(productId: string): string | null {
  return catalogue[productId]?.price ?? null;
}

export async function buy(productId: string): Promise<{ ok: boolean; reason?: string }> {
  const ready = await startIap();
  if (!ready) return { ok: false, reason: 'Could not reach the App Store. Try again in a moment.' };
  try {
    await requestPurchase({ request: { apple: { sku: productId } }, type: 'in-app' });
    // Deliberately no success here. The listener decides.
    return { ok: true };
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    if (/cancel/i.test(msg) || /E_USER_CANCELLED/i.test(String(e?.code ?? ''))) {
      return { ok: false, reason: '' };
    }
    return { ok: false, reason: msg || 'That did not go through.' };
  }
}

// Everything this Apple ID has bought, replayed through the same listener.
export async function restore(): Promise<{ ok: boolean; reason?: string }> {
  const ready = await startIap();
  if (!ready) return { ok: false, reason: 'Could not reach the App Store. Try again in a moment.' };
  try {
    await restorePurchases();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: String(e?.message ?? 'Could not restore.') };
  }
}
