// Offline download for sounds. Saves a track's audio to the device so it plays
// with no wifi. Uses the legacy expo-file-system API on purpose: in SDK 54 the
// default 'expo-file-system' export is the new File/Directory API, which does
// not expose documentDirectory / createDownloadResumable.
import * as FileSystem from 'expo-file-system/legacy';

const DIR = (FileSystem.documentDirectory || '') + 'sounds/';

function pathFor(id: string) {
  return DIR + id + '.mp3';
}

async function ensureDir() {
  try {
    const info = await FileSystem.getInfoAsync(DIR);
    if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
  } catch {}
}

export async function isDownloaded(id: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(pathFor(id));
    return info.exists && (info.size ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function localUriFor(id: string): Promise<string | null> {
  return (await isDownloaded(id)) ? pathFor(id) : null;
}

export async function downloadTrack(
  id: string,
  url: string,
  onProgress?: (frac: number) => void
): Promise<boolean> {
  try {
    await ensureDir();
    const task = FileSystem.createDownloadResumable(url, pathFor(id), {}, (p) => {
      const total = p.totalBytesExpectedToWrite;
      if (onProgress && total > 0) onProgress(p.totalBytesWritten / total);
    });
    const res = await task.downloadAsync();
    return !!res && !!res.uri;
  } catch {
    return false;
  }
}

export async function removeDownload(id: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(pathFor(id), { idempotent: true });
  } catch {}
}
