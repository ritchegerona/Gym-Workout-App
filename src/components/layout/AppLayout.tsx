import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  ClipboardList,
  Dumbbell,
  Home,
  Play,
  Timer,
  User,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useActiveWorkout } from "../../stores/activeWorkout";
import { formatClock } from "../../utils/format";
import { RestTimerBar } from "../workout/RestTimerBar";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/workouts", label: "Workouts", icon: ClipboardList },
  { to: "/history", label: "History", icon: Dumbbell },
  { to: "/progress", label: "Progress", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
];

function NavIcon({ item, active }: { item: (typeof NAV)[number]; active: boolean }) {
  const Icon = item.icon;
  return (
    <Icon
      size={22}
      strokeWidth={active ? 2.4 : 2}
      aria-hidden="true"
      className={active ? "" : "opacity-80"}
    />
  );
}

export function AppLayout() {
  const location = useLocation();
  const hasActive = !!useActiveWorkout((s) => s.sessionId);
  const restEndsAt = useActiveWorkout((s) => s.restEndsAt);
  const startedAt = useActiveWorkout((s) => s.startedAt);
  const workoutName = useActiveWorkout((s) => s.name);
  const onActivePage = location.pathname === "/active";
  const showActiveBar = hasActive && !onActivePage;

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-card p-4 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2 pt-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Dumbbell size={20} aria-hidden="true" />
          </span>
          <span className="text-lg font-bold tracking-tight">IronTrack</span>
        </div>
        <nav className="flex flex-col gap-1" aria-label="Main">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <NavIcon item={item} active={location.pathname === item.to} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        {showActiveBar && (
          <NavLink
            to="/active"
            className="mt-auto flex flex-col gap-1 rounded-2xl bg-primary/10 p-4 ring-1 ring-primary/30"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              In progress
            </span>
            <span className="truncate font-semibold">{workoutName}</span>
            {restEndsAt !== null && (
              <RestTimerInline />
            )}
            <span className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <Play size={15} aria-hidden="true" /> Resume Workout
            </span>
          </NavLink>
        )}
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="pt-safe sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Dumbbell size={16} aria-hidden="true" />
            </span>
            <span className="font-bold tracking-tight">IronTrack</span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-32 pt-4 md:px-8 md:pb-12 md:pt-8">
          <Outlet />
        </main>

        {/* Mobile active-workout banner above tab bar */}
        {showActiveBar && !restEndsAt && (
          <div className="pb-safe fixed inset-x-0 bottom-[68px] z-40 px-3 md:hidden">
            <NavLink
              to="/active"
              className="flex items-center justify-between rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-xl"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Play size={18} aria-hidden="true" />
                <span className="truncate text-sm font-semibold">{workoutName}</span>
              </span>
              {startedAt && <WorkoutElapsedMini />}
            </NavLink>
          </div>
        )}

        {showActiveBar && restEndsAt && (
          <RestTimerBar />
        )}

        {/* Mobile bottom nav */}
        <nav
          aria-label="Main"
          className="pb-safe fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur md:hidden"
        >
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex h-[68px] flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )
              }
              aria-current={location.pathname === item.to ? "page" : undefined}
            >
              <NavIcon item={item} active={location.pathname === item.to} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

function WorkoutElapsedMini() {  const startedAt = useActiveWorkout((s) => s.startedAt);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  if (!startedAt) return null;
  return (
    <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
      {formatClock(now - startedAt)}
    </span>
  );
}

function RestTimerInline() {
  const restEndsAt = useActiveWorkout((s) => s.restEndsAt);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);
  if (restEndsAt === null) return null;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums">
      <Timer size={14} aria-hidden="true" />
      {formatClock(restEndsAt - now)}
    </span>
  );
}
