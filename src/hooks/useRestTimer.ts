import { useEffect, useRef, useState } from "react";
import { useSettings } from "../stores/settings";
import { useActiveWorkout } from "../stores/activeWorkout";

/** Short beep sequence via WebAudio — no assets needed. */
export function playTimerSound() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const play = (start: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    };
    const t = ctx.currentTime + 0.05;
    play(t, 880);
    play(t + 0.25, 1108.7);
    play(t + 0.5, 1318.5);
    window.setTimeout(() => void ctx.close(), 1200);
  } catch {
    // audio unavailable
  }
}

function notifyDone(durationSec: number) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification("Rest complete", {
        body: `Your ${durationSec}s rest is over — next set!`,
        tag: "irontrack-rest",
      });
    } catch {
      // notification failed silently
    }
  }
}

export function useRestTimer() {
  const restEndsAt = useActiveWorkout((s) => s.restEndsAt);
  const restDurationSec = useActiveWorkout((s) => s.restDurationSec);
  const extendRest = useActiveWorkout((s) => s.extendRest);
  const skipRest = useActiveWorkout((s) => s.skipRest);
  const soundEnabled = useSettings((s) => s.soundEnabled);
  const vibrationEnabled = useSettings((s) => s.vibrationEnabled);
  const notificationsEnabled = useSettings((s) => s.notificationsEnabled);

  const [remainingMs, setRemainingMs] = useState(() =>
    restEndsAt === null ? 0 : Math.max(0, restEndsAt - Date.now()),
  );
  const firedRef = useRef(false);

  useEffect(() => {
    if (restEndsAt === null) {
      firedRef.current = false;
      setRemainingMs(0);
      return;
    }
    const tick = () => {
      const rem = Math.max(0, restEndsAt - Date.now());
      setRemainingMs(rem);
      if (rem <= 0 && !firedRef.current) {
        firedRef.current = true;
        if (soundEnabled) playTimerSound();
        if (vibrationEnabled && "vibrate" in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
        if (notificationsEnabled) notifyDone(restDurationSec);
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [
    restEndsAt,
    soundEnabled,
    vibrationEnabled,
    notificationsEnabled,
    restDurationSec,
  ]);

  const isActive = restEndsAt !== null;

  return {
    isActive,
    remainingMs,
    durationSec: restDurationSec,
    add: (sec: number) => extendRest(sec),
    subtract: (sec: number) => {
      if (restEndsAt === null) return;
      const next = restEndsAt - sec * 1000;
      if (next <= Date.now()) skipRest();
      else useActiveWorkout.setState({ restEndsAt: next });
    },
    skip: skipRest,
  };
}
