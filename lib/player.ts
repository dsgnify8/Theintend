// A global audio player that lives above any screen, so a sound keeps playing
// when you navigate away. Screens read status with usePlayerStatus() and control
// it with playTrack / togglePlay / seekTo.
import { useEffect, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { SOUNDS } from '@/constants/sounds';

let player: AudioPlayer | null = null;
let currentId: string | null = null;
let currentTitle = '';
let sub: { remove: () => void } | null = null;
let isPlaying = false;

// How many times a finished track may start the next one before it stops on
// its own. Reset by starting something by hand, not by pausing.
const AUTO_LIMIT = 5;
let autoPlayed = 0;
// True only while the player itself is moving on, so playTrack can tell the
// difference between that and a person choosing something.
let advancing = false;

function nextTrack(afterId: string | null) {
  const list = SOUNDS.filter((x) => !!x.url);
  if (list.length < 2) return null;
  const i = list.findIndex((x) => x.id === afterId);
  const next = list[(i + 1) % list.length];
  return next?.url ? { id: next.id, url: next.url as string, title: next.title } : null;
}

function advanceFrom(fromId: string | null) {
  // A listener belonging to a player that has already been replaced.
  if (!fromId || fromId !== currentId) return;
  if (autoPlayed >= AUTO_LIMIT) { isPlaying = false; return; }
  const next = nextTrack(fromId);
  if (!next) { isPlaying = false; return; }
  autoPlayed += 1;
  // Out of this callback first. The old player is torn down inside playTrack
  // and this is its own listener.
  setTimeout(() => {
    advancing = true;
    try { playTrack(next.id, next.url, next.title); } finally { advancing = false; }
  }, 0);
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});

function attach(p: AudioPlayer) {
  try { sub?.remove(); } catch {}
  try {
    sub = p.addListener('playbackStatusUpdate', (s: any) => {
      if (typeof s?.playing === 'boolean') isPlaying = s.playing;
      if (s?.didJustFinish) advanceFrom(currentId);
      emit();
    });
  } catch { sub = null; }
}

export function playTrack(id: string, url: string, title: string) {
  // Chosen by a person, so the run starts again from zero.
  if (!advancing) autoPlayed = 0;
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
  autoPlayed = 0;
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
