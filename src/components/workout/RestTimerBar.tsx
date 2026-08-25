import { Link } from "react-router-dom";
import { X, Timer } from "lucide-react";
import { useRestTimer } from "../../hooks/useRestTimer";
import { formatClock } from "../../utils/format";
import { Button } from "../ui/Button";

/** Compact rest timer shown above the tab bar on any page during a workout. */
export function RestTimerBar() {
  const { isActive, remainingMs, add, subtract, skip } = useRestTimer();
  if (!isActive) return null;

  return (
    <div className="pb-safe fixed inset-x-0 bottom-[68px] z-40 px-3 md:hidden">
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-card p-2 pl-4 shadow-xl ring-1 ring-primary/50">
        <Link
          to="/active"
          className="flex min-w-0 items-center gap-3"
          aria-label="Return to workout"
        >
          <Timer size={18} className="shrink-0 text-primary" aria-hidden="true" />
          <span className="font-mono text-xl font-bold tabular-nums text-primary">
            {formatClock(remainingMs)}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => subtract(15)}>
            −15s
          </Button>
          <Button variant="secondary" size="sm" onClick={() => add(15)}>
            +15s
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={skip} aria-label="Skip rest">
            <X size={18} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
