"use client";

import { AlertSoundType } from "../models/delivery";

export interface AlertSoundOption {
  id: AlertSoundType;
  title: string;
  description: string;
  tag: string;
}

export const ALERT_SOUND_OPTIONS: AlertSoundOption[] = [
  {
    id: "chime",
    title: "Express Fanfare",
    description: "Loud, bright 4-tone rising chime (Swiggy / Zepto style)",
    tag: "Default",
  },
  {
    id: "urgent_pulse",
    title: "Urgent Siren Pulse",
    description: "Rapid alternating high-frequency beeps for busy streets",
    tag: "High Alert",
  },
  {
    id: "radar_ping",
    title: "Digital Radar Sonar",
    description: "Modern resonant sonar ping with harmonic echo",
    tag: "Smooth",
  },
  {
    id: "bell_ring",
    title: "Courier Service Bell",
    description: "Classic dual bicycle / counter mechanical bell ring",
    tag: "Mechanical",
  },
  {
    id: "marimba",
    title: "Melodic Marimba",
    description: "Warm, energetic wooden mallet chord progression",
    tag: "Pleasant",
  },
];

let audioContextInstance: AudioContext | null = null;
let alertLoopIntervalId: any = null;
let currentLoopingSound: AlertSoundType | null = null;
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
    console.warn("[delivery sound] AudioContext error:", err);
    return null;
  }
}

/**
 * Auto-unlock Web Audio API on first user interaction.
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

/**
 * Explicitly unlock the AudioContext on user interaction.
 */
export function unlockAudioContext(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  } catch {
    // ignore
  }
}

/**
 * Helper to synthesize an individual note with gain envelope.
 */
function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  gainLevel: number,
  type: OscillatorType = "sine"
) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(gainLevel, 0.001), startTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

// --- SOUND PRESET SYNTHESIZERS ---

/**
 * 1. Express Fanfare (D5 -> G5 -> B5 -> D6), repeated
 */
function playChimePreset(ctx: AudioContext, now: number, volume: number) {
  const playSeq = (delay: number) => {
    const notes = [
      { freq: 587.33, start: 0.0, dur: 0.16, gain: 0.45 * volume },   // D5
      { freq: 783.99, start: 0.14, dur: 0.18, gain: 0.55 * volume },  // G5
      { freq: 987.77, start: 0.28, dur: 0.22, gain: 0.65 * volume },  // B5
      { freq: 1174.66, start: 0.45, dur: 0.5, gain: 0.85 * volume },  // D6
    ];
    notes.forEach((n) => playTone(ctx, n.freq, now + delay + n.start, n.dur, n.gain, "sine"));
  };

  playSeq(0.02);
  playSeq(0.85);
}

/**
 * 2. Urgent Siren Pulse (Rapid alternating dual-tone beeps)
 */
function playUrgentPulsePreset(ctx: AudioContext, now: number, volume: number) {
  const playPulseBurst = (offset: number) => {
    const beeps = [
      { freq: 987.77, start: 0.00, dur: 0.10, gain: 0.70 * volume },
      { freq: 1318.51, start: 0.11, dur: 0.10, gain: 0.85 * volume },
      { freq: 987.77, start: 0.22, dur: 0.10, gain: 0.70 * volume },
      { freq: 1318.51, start: 0.33, dur: 0.22, gain: 0.90 * volume },
    ];
    beeps.forEach((b) => playTone(ctx, b.freq, now + offset + b.start, b.dur, b.gain, "triangle"));
  };

  playPulseBurst(0.02);
  playPulseBurst(0.65);
}

/**
 * 3. Digital Radar Sonar (Modern resonant ping with harmonic echoes)
 */
function playRadarPingPreset(ctx: AudioContext, now: number, volume: number) {
  const pings = [
    { freq: 1046.50, overtone: 2093.00, start: 0.02, dur: 0.55, gain: 0.75 * volume }, // C6
    { freq: 1318.51, overtone: 2637.02, start: 0.35, dur: 0.55, gain: 0.80 * volume }, // E6
    { freq: 1567.98, overtone: 3135.96, start: 0.70, dur: 0.70, gain: 0.90 * volume }, // G6
  ];

  pings.forEach((p) => {
    playTone(ctx, p.freq, now + p.start, p.dur, p.gain, "sine");
    playTone(ctx, p.overtone, now + p.start, p.dur * 0.5, p.gain * 0.35, "sine");
  });
}

/**
 * 4. Courier Service Bell (Double mechanical bell strike)
 */
function playBellRingPreset(ctx: AudioContext, now: number, volume: number) {
  const playStrike = (delay: number, pitchOffset: number) => {
    // Fundamental strike + resonant shimmer
    playTone(ctx, 1567.98 * pitchOffset, now + delay, 0.40, 0.75 * volume, "sine");
    playTone(ctx, 3135.96 * pitchOffset, now + delay, 0.25, 0.45 * volume, "triangle");
    playTone(ctx, 4699.00 * pitchOffset, now + delay, 0.18, 0.25 * volume, "sine");
  };

  // First strike
  playStrike(0.02, 1.0);
  // Second higher strike
  playStrike(0.16, 1.12);

  // Repeat sequence
  playStrike(0.70, 1.0);
  playStrike(0.84, 1.12);
}

/**
 * 5. Melodic Marimba (Warm wooden xylophone arpeggio)
 */
function playMarimbaPreset(ctx: AudioContext, now: number, volume: number) {
  const playArpeggio = (offset: number) => {
    const notes = [
      { freq: 523.25, start: 0.00, dur: 0.20, gain: 0.55 * volume }, // C5
      { freq: 659.25, start: 0.10, dur: 0.20, gain: 0.60 * volume }, // E5
      { freq: 783.99, start: 0.20, dur: 0.22, gain: 0.65 * volume }, // G5
      { freq: 1046.50, start: 0.30, dur: 0.35, gain: 0.75 * volume }, // C6
      { freq: 1318.51, start: 0.44, dur: 0.50, gain: 0.85 * volume }, // E6
    ];
    notes.forEach((n) => playTone(ctx, n.freq, now + offset + n.start, n.dur, n.gain, "triangle"));
  };

  playArpeggio(0.02);
  playArpeggio(0.75);
}

/**
 * Play a specific sound preset once immediately.
 */
export function playAlertSoundPreset(
  soundType: AlertSoundType = "chime",
  volume = 0.8
): void {
  if (typeof window === "undefined") return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    switch (soundType) {
      case "urgent_pulse":
        playUrgentPulsePreset(ctx, now, volume);
        break;
      case "radar_ping":
        playRadarPingPreset(ctx, now, volume);
        break;
      case "bell_ring":
        playBellRingPreset(ctx, now, volume);
        break;
      case "marimba":
        playMarimbaPreset(ctx, now, volume);
        break;
      case "chime":
      default:
        playChimePreset(ctx, now, volume);
        break;
    }

    // Trigger haptic vibration pattern on mobile devices
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([200, 100, 250, 100, 400]);
      } catch {}
    }

    console.log(`[delivery sound] 🔔 Played alert sound "${soundType}"`);
  } catch (err) {
    console.warn("[delivery sound] Failed to play alert sound:", err);
  }
}

/**
 * Play one-shot delivery alert sound with throttling protection.
 * (Backward compatible for single triggers)
 */
export function playOrderAlertSound(
  volume = 0.8,
  force = false,
  soundType: AlertSoundType = "chime"
): void {
  if (typeof window === "undefined") return;

  const nowMs = Date.now();
  if (!force && nowMs - lastPlayedAt < 2200) {
    console.log("[delivery sound] 🔕 Alert sound throttled");
    return;
  }
  lastPlayedAt = nowMs;

  playAlertSoundPreset(soundType, volume);
}

/**
 * Start looping the order alert sound continuously until stopped.
 * Loops every 3.2 seconds with audio chime and mobile vibration.
 */
export function startOrderAlertLoop(
  soundType: AlertSoundType = "chime",
  volume = 0.8
): void {
  if (typeof window === "undefined") return;

  // If already looping with the same sound, keep going
  if (alertLoopIntervalId !== null && currentLoopingSound === soundType) {
    return;
  }

  // Clear any existing loop first
  stopOrderAlertLoop();

  currentLoopingSound = soundType;
  console.log(`[delivery sound] 🔁 Starting order alert loop ("${soundType}")...`);

  // Play first chime immediately
  playAlertSoundPreset(soundType, volume);

  // Set recurring interval (3.2 seconds cycle)
  alertLoopIntervalId = setInterval(() => {
    playAlertSoundPreset(soundType, volume);
  }, 3200);
}

/**
 * Stop looping the order alert sound immediately.
 * Called when partner accepts the order, dismisses it, or goes offline.
 */
export function stopOrderAlertLoop(): void {
  if (alertLoopIntervalId !== null) {
    clearInterval(alertLoopIntervalId);
    alertLoopIntervalId = null;
    currentLoopingSound = null;
    console.log("[delivery sound] 🛑 Order alert loop stopped");
  }
}

/**
 * Check if the order alert sound is currently looping.
 */
export function isOrderAlertLoopActive(): boolean {
  return alertLoopIntervalId !== null;
}
