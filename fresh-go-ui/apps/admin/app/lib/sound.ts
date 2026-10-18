"use client";

const SOUND_STORAGE_KEY = "freshgo_admin_sound_enabled";

let audioContextInstance: AudioContext | null = null;
let lastPlayedAt = 0;

/**
 * Returns or creates the shared Web AudioContext.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  try {
    const AudioCtx =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!audioContextInstance) {
      audioContextInstance = new AudioCtx();
    }

    if (audioContextInstance.state === "suspended") {
      audioContextInstance.resume().catch(() => {});
    }

    return audioContextInstance;
  } catch (err) {
    console.warn("[admin sound] AudioContext error:", err);
    return null;
  }
}

/**
 * Auto-unlock Web Audio API on first user interaction with the page.
 */
if (typeof window !== "undefined") {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
    } catch {
      // ignore
    } finally {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    }
  };

  window.addEventListener("click", unlockAudio, { passive: true, once: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true, once: true });
  window.addEventListener("keydown", unlockAudio, { passive: true, once: true });
}

export function isOrderSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = window.localStorage.getItem(SOUND_STORAGE_KEY);
  return val === null ? true : val === "true";
}

export function setOrderSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
}

/**
 * Helper to synthesize a single clean tone with smooth gain attack and release.
 */
function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  gainLevel = 0.5,
  type: OscillatorType = "sine"
) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  // Smooth attack & decay curve
  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(gainLevel, startTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * Plays the bright, modern 4-tone rising dark store order fanfare (Swiggy / Zepto style).
 */
export function playOrderAlertSound(force = false): boolean {
  if (!force && !isOrderSoundEnabled()) {
    return false;
  }

  // Throttle to at most once every 1.5s
  const nowMs = Date.now();
  if (nowMs - lastPlayedAt < 1500 && !force) {
    return false;
  }
  lastPlayedAt = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const volume = 0.85;

    const playSeq = (delay: number) => {
      const notes = [
        { freq: 587.33, start: 0.0, dur: 0.16, gain: 0.45 * volume },  // D5
        { freq: 783.99, start: 0.14, dur: 0.18, gain: 0.55 * volume }, // G5
        { freq: 987.77, start: 0.28, dur: 0.22, gain: 0.65 * volume }, // B5
        { freq: 1174.66, start: 0.45, dur: 0.5, gain: 0.85 * volume }, // D6
      ];
      notes.forEach((n) =>
        playTone(ctx, n.freq, now + delay + n.start, n.dur, n.gain, "sine")
      );
    };

    // Play double sequence for clear, unmistakable dark store dispatch chime
    playSeq(0.02);
    playSeq(0.82);

    return true;
  } catch (err) {
    console.warn("[admin sound] Play sound error:", err);
    return false;
  }
}
