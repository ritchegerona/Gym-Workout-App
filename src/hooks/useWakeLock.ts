import { useEffect } from "react";

type WakeLockish = {
  request: (type: "screen") => Promise<{ release: () => Promise<void> }>;
};

/**
 * Keeps the screen awake while `active` is true (gym sessions).
 * Re-acquires after the tab is backgrounded; no-ops when unsupported.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const nav = navigator as Navigator & { wakeLock?: WakeLockish };
    if (!nav.wakeLock) return;

    let sentinel: { release: () => Promise<void> } | null = null;
    let released = false;

    async function acquire() {
      try {
        sentinel = await nav.wakeLock!.request("screen");
      } catch {
        // denied or unavailable — non-fatal
      }
    }

    function onVisibility() {
      if (document.visibilityState === "visible" && !released && !sentinel) {
        void acquire();
      }
    }

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active]);
}
