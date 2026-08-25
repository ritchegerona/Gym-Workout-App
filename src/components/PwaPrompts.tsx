import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw, Share, SquarePlus, X } from "lucide-react";
import { registerSW } from "virtual:pwa-register";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";
import {
  isIOSDevice,
  isStandalone,
  usePwaInstall,
} from "../hooks/usePwaInstall";
import { useToast } from "./ui/Toast";

const DISMISS_KEY = "irontrack-install-dismissed";

/** Service worker lifecycle: prompts when a new version is ready. */
export function PwaUpdater() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateSWRef = useRef<(reload?: boolean) => Promise<void>>(async () => {});

  useEffect(() => {
    updateSWRef.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
    });
  }, []);

  if (!needRefresh) return null;

  return (
    <div className="fixed inset-x-0 bottom-28 z-[70] flex justify-center px-4 md:bottom-6">
      <div
        role="alert"
        className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-xl"
      >
        <RefreshCw size={18} className="shrink-0 text-primary" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm font-medium">
          New version available
        </p>
        <Button size="sm" onClick={() => void updateSWRef.current(true)}>
          Reload
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setNeedRefresh(false)}
          aria-label="Dismiss update notice"
        >
          Later
        </Button>
      </div>
    </div>
  );
}

/** Home-screen install banner (Android/desktop Chromium). */
export function InstallBanner() {
  const { canInstall, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "1",
  );
  const toast = useToast();

  if (!canInstall || dismissed || isStandalone()) return null;

  return (
    <div className="mx-auto mt-4 flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-primary/30 bg-primary/[0.07] px-4 py-3">
      <Download size={18} className="shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Install IronTrack</p>
        <p className="truncate text-xs text-muted-foreground">
          Full-screen, offline-ready, right from your home screen.
        </p>
      </div>
      <Button
        size="sm"
        onClick={async () => {
          const outcome = await promptInstall();
          if (outcome === "accepted") toast("success", "Installing…");
        }}
      >
        Install
      </Button>
      <button
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, "1");
          setDismissed(true);
        }}
        aria-label="Dismiss install suggestion"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Profile-page entry point: native install or iOS manual guide. */
export function InstallAppRow() {
  const { canInstall, promptInstall } = usePwaInstall();
  const [guideOpen, setGuideOpen] = useState(false);
  const toast = useToast();
  const standalone = isStandalone();

  if (standalone) {
    return (
      <SettingRow label="Installed app">
        <span className="text-sm text-muted-foreground">Running installed ✓</span>
      </SettingRow>
    );
  }

  if (isIOSDevice()) {
    return (
      <>
        <button
          className="w-full px-4 py-3.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          onClick={() => setGuideOpen(true)}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <SquarePlus size={16} className="text-muted-foreground" aria-hidden="true" />
            Add to Home Screen
          </span>
        </button>
        <Dialog
          open={guideOpen}
          onClose={() => setGuideOpen(false)}
          title="Add to Home Screen"
          footer={
            <Button className="w-full" onClick={() => setGuideOpen(false)}>
              Got it
            </Button>
          }
        >
          <ol className="space-y-3 text-sm">
            <IOSStep n={1}>
              Open this site in <strong>Safari</strong> if you aren&apos;t already.
            </IOSStep>
            <IOSStep n={2}>
              Tap the <Share size={15} className="inline align-text-bottom" aria-label="Share" />{" "}
              <strong>Share</strong> button in the toolbar.
            </IOSStep>
            <IOSStep n={3}>
              Scroll and tap <strong>Add to Home Screen</strong>, then confirm.
            </IOSStep>
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            The app then launches full-screen and works offline.
          </p>
        </Dialog>
      </>
    );
  }

  if (!canInstall) return null;

  return (
    <SettingRow label="Install app">
      <Button
        size="sm"
        onClick={async () => {
          const outcome = await promptInstall();
          if (outcome === "accepted") toast("success", "Installing…");
        }}
      >
        Install
      </Button>
    </SettingRow>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

function IOSStep({
  n,
  children,
}: {
  n: number;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
        {n}
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}
