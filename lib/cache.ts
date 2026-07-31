// A read-through cache on the device, so the app keeps working with no signal.
//
// The rule everywhere this is used: a good read writes here, a failed read
// comes from here, and only if there is nothing here at all does the bundled
// fallback appear. Nothing is ever served from here in preference to a live
// read, so this cannot make the app show stale data when the network is fine.
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'intend.cache.';

// Bumped when a stored shape changes, so an old entry is ignored rather than
// being read back into a type it no longer matches.
const VERSION = 1;

type Envelope<T> = { v: number; at: number; data: T };

export async function writeCache<T>(key: string, data: T): Promise<void> {
  try {
    const env: Envelope<T> = { v: VERSION, at: Date.now(), data };
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(env));
  } catch {
    // A full disk must never break a working screen.
  }
}

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope<T>;
    if (!env || env.v !== VERSION) return null;
    return env.data ?? null;
  } catch {
    return null;
  }
}

// When the cached copy was written, for telling someone what they are looking at.
export async function cacheAge(key: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope<unknown>;
    return env?.at ?? null;
  } catch {
    return null;
  }
}

export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {}
}
