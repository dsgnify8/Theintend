// A global audio player that lives above any screen, so a sound keeps playing
// when you navigate away. Screens read status with usePlayerStatus() and control
// it with playTrack / togglePlay / seekTo.
import { useEffect, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

let player: AudioPlayer | null = null;
let currentId: string | null = null;
let currentTitle = '';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});

export function playTrack(id: string, url: string, title: string) {
  if (currentId === id && player) {
    player.play();
    emit();
    return;
  }
  if (player) { try { player.remove(); } catch {} player = null; }
  try {
    player = createAudioPlayer({ uri: url });
    currentId = id;
    currentTitle = title;
    player.play();
  } catch {
    player = null;
    currentId = null;
  }
  emit();
}

export function togglePlay() {
  if (!player) return;
  if (player.playing) player.pause();
  else player.play();
  emit();
}

export function seekTo(sec: number) {
  try { if (player) player.seekTo(sec); } catch {}
  emit();
}

export function stopTrack() {
  if (player) { try { player.remove(); } catch {} player = null; }
  currentId = null;
  emit();
}

export function getCurrentId() { return currentId; }

export function usePlayerStatus() {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick((x) => x + 1);
    listeners.add(l);
    const iv = setInterval(() => tick((x) => x + 1), 500);
    return () => { listeners.delete(l); clearInterval(iv); };
  }, []);
  return {
    id: currentId,
    title: currentTitle,
    playing: player?.playing ?? false,
    currentTime: player?.currentTime ?? 0,
    duration: player?.duration ?? 0,
    isLoaded: player?.isLoaded ?? false,
  };
}
