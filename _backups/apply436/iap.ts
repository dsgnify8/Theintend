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

// Whoever is waiting on the current purchase.
//
// Apple answers on a listener rather than by returning, so the button has to
// wait for that answer instead of assuming it went well. Only ever one at a
// time, since only one sheet can be open.
export type BuyOutcome = { ok: boolean; reason?: string };
let pending: ((o: BuyOutcome) => void) | null = null;

function settle(outcome: BuyOutcome) {
  const done = pending;
  pending = null;
  done?.(outcome);
}

export function setPurchaseHandler(fn: OnOwned) {
  onOwned = fn;
}

// Pulled out so a purchase can try again if the catalogue was empty when the
// app started, which happens on a bad connection or before a product is live.
export async function loadCatalogue(): Promise<number> {
  try {
    const list: any = await fetchProducts({ skus: ALL_PRODUCT_IDS, type: 'in-app' });
    const arr = Array.isArray(list) ? list : (list?.products ?? []);
    const next: Record<string, IapProduct> = {};
    for (const pr of arr as any[]) {
      const id = pr?.id ?? pr?.productId;
      if (!id) continue;
      next[String(id)] = {
        id: String(id),
        price: pr?.displayPrice ?? pr?.localizedPrice ?? null,
        title: pr?.title ?? null,
      };
    }
    if (Object.keys(next).length) catalogue = next;
    return Object.keys(next).length;
  } catch {
    return 0;
  }
}

export async function startIap(): Promise<boolean> {
  if (started) return true;
  try {
    await initConnection();

    subs.push(
      purchaseUpdatedListener(async (purchase: any) => {
        const productId = purchase?.productId ?? purchase?.id;
        const programId = productId ? programIdForProduct(String(productId)) : null;
        if (!programId) { settle({ ok: false, reason: 'That purchase was for something else.' }); return; }
        try {
          // Recorded before the transaction is finished. If this throws, Apple
          // keeps redelivering until it works, which is what we want.
          await onOwned?.(programId);
          await finishTransaction({ purchase, isConsumable: false });
          settle({ ok: true });
        } catch (e: any) {
          // Left unfinished on purpose. Apple will deliver it again.
          settle({ ok: false, reason: 'It was paid for but we could not record it. It will arrive shortly, or tap Restore purchases.' });
        }
      }),
    );

    subs.push(
      purchaseErrorListener((err: any) => {
        // Where Apple reports a purchase that did not happen. This was an
        // empty function, which is why a failure looked like nothing at all.
        const code = String(err?.code ?? '');
        const cancelled = /cancel/i.test(code) || /cancel/i.test(String(err?.message ?? ''));
        settle({ ok: false, reason: cancelled ? '' : (err?.message || 'The purchase did not go through.') });
      }),
    );

    await loadCatalogue();

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

export async function buy(productId: string): Promise<BuyOutcome> {
  const ready = await startIap();
  if (!ready) return { ok: false, reason: 'Could not reach the App Store. Try again in a moment.' };

  // If Apple does not know this product there is nothing to buy, and asking
  // anyway fails quietly. Better to say so.
  if (!catalogue[productId]) {
    await loadCatalogue();
    if (!catalogue[productId]) {
      return { ok: false, reason: 'This program is not available to buy just now. Please try again shortly.' };
    }
  }

  // Cleared before asking, so a listener from an earlier attempt cannot answer
  // this one.
  settle({ ok: false, reason: '' });

  return new Promise<BuyOutcome>((resolve) => {
    let done = false;
    const finish = (o: BuyOutcome) => { if (!done) { done = true; resolve(o); } };
    pending = finish;

    // Nothing should hang forever. Long enough for Face ID, a password, and a
    // slow network.
    const timer = setTimeout(() => {
      if (!done) {
        pending = null;
        finish({ ok: false, reason: 'That took too long. If you were charged it will appear shortly, or tap Restore purchases.' });
      }
    }, 90000);

    requestPurchase({ request: { apple: { sku: productId } }, type: 'in-app' })
      .catch((e: any) => {
        const msg = String(e?.message ?? '');
        const cancelled = /cancel/i.test(msg) || /cancel/i.test(String(e?.code ?? ''));
        pending = null;
        finish({ ok: false, reason: cancelled ? '' : (msg || 'That did not go through.') });
      });

    const stop = () => clearTimeout(timer);
    const wrapped = finish;
    pending = (o: BuyOutcome) => { stop(); wrapped(o); };
  });
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
