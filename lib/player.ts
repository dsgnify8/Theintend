// A global audio player that lives above any screen, so a sound keeps playing
// when you navigate away. Screens read status with usePlayerStatus() and control
// it with playTrack / togglePlay / seekTo.
import { useEffect, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

let player: AudioPlayer | null = null;
let currentId: string | null = null;
let currentTitle = '';
let sub: { remove: () => void } | null = null;
let isPlaying = false;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});

function attach(p: AudioPlayer) {
  try { sub?.remove(); } catch {}
  try {
    sub = p.addListener('playbackStatusUpdate', (s: any) => {
      if (typeof s?.playing === 'boolean') isPlaying = s.playing;
      emit();
    });
  } catch { sub = null; }
}

export function playTrack(id: string, url: string, title: string) {
  if (currentId === id && player) {
    player.play();
    isPlaying = true;
    emit();
    return;
  }
  if (player) { try { sub?.remove(); } catch {} try { player.remove(); } catch {} player = null; sub = null; }
  isPlaying = false;
  try {
    player = createAudioPlayer({ uri: url });
    currentId = id;
    currentTitle = title;
    attach(player);
    player.play();
    isPlaying = true;
  } catch {
    player = null;
    currentId = null;
  }
  emit();
}

export function togglePlay() {
  if (!player) return;
  if (isPlaying) { player.pause(); isPlaying = false; }
  else { player.play(); isPlaying = true; }
  emit();
}

export function seekTo(sec: number) {
  try { if (player) player.seekTo(sec); } catch {}
  emit();
}

export function stopTrack() {
  if (player) { try { sub?.remove(); } catch {} try { player.remove(); } catch {} player = null; sub = null; }
  currentId = null;
  isPlaying = false;
  emit();
}

export function getCurrentId() { return currentId; }

function readStatus() {
  return {
    id: currentId,
    title: currentTitle,
    playing: isPlaying,
    currentTime: player?.currentTime ?? 0,
    duration: player?.duration ?? 0,
    isLoaded: player?.isLoaded ?? false,
  };
}

// Snapshot the live player state into React state so the screen actually
// re-renders as it changes. Returning a plain object read from module variables
// did not update reliably (the compiler can memoize it away), which is what froze
// the play button and the timer until the screen was reopened.
export function usePlayerStatus() {
  const [snap, setSnap] = useState(readStatus);
  useEffect(() => {
    const update = () => setSnap(readStatus());
    listeners.add(update);
    update();
    const iv = setInterval(update, 300);
    return () => { listeners.delete(update); clearInterval(iv); };
  }, []);
  return snap;
}
