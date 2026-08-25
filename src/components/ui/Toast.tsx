import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, Info, TriangleAlert, XCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { uid } from "../../db/db";

type ToastKind = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<(kind: ToastKind, message: string) => void>(
  () => {},
);

export function useToast() {
  return useContext(ToastContext);
}

const icons: Record<ToastKind, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: TriangleAlert,
};

const colors: Record<ToastKind, string> = {
  success: "text-success",
  error: "text-destructive",
  info: "text-muted-foreground",
  warning: "text-yellow-500 dark:text-yellow-400",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = uid();
    setToasts((t) => [...t.slice(-3), { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => {
          const Icon = icons[t.kind];
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border border-border bg-card px-4 py-3 shadow-lg",
              )}
            >
              <Icon size={18} className={cn("mt-0.5 shrink-0", colors[t.kind])} aria-hidden="true" />
              <p className="text-sm leading-snug">{t.message}</p>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
