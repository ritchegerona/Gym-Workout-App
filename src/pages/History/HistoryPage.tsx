import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, History, Plus } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getFinishedSessions } from "../../db/sessions";
import { exerciseVolume } from "../../utils/calculations";
import { formatDateShort, formatDuration } from "../../utils/format";
import { formatWeight } from "../../utils/units";
import { useSettings } from "../../stores/settings";
import { useActiveWorkout } from "../../stores/activeWorkout";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import type { WorkoutSession } from "../../types";

type RangeFilter = "all" | "week" | "month" | "3months";

export default function HistoryPage() {
  const navigate = useNavigate();
  const unit = useSettings((s) => s.unit);
  const sessions = useAsync(getFinishedSessions, []);
  const [range, setRange] = useState<RangeFilter>("all");
  const [workoutFilter, setWorkoutFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    let list = sessions.data ?? [];
    if (range !== "all") {
      const days = range === "week" ? 7 : range === "month" ? 30 : 90;
      const cutoff = Date.now() - days * 86_400_000;
      list = list.filter((s) => s.startedAt >= cutoff);
    }
    if (workoutFilter !== "all") {
      list = list.filter(
        (s) => (s.templateName ?? "Custom") === workoutFilter,
      );
    }
    return list;
  }, [sessions.data, range, workoutFilter]);

  // Group by date string
  const grouped = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    for (const s of filtered) {
      const key = new Date(s.startedAt).toDateString();
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [filtered]);

  const workoutNames = useMemo(() => {
    const names = new Set<string>();
    for (const s of sessions.data ?? []) names.add(s.templateName ?? "Custom");
    return [...names].sort();
  }, [sessions.data]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <Button
          variant="secondary"
          onClick={() => {
            const store = useActiveWorkout.getState();
            if (!store.sessionId) store.startEmpty();
            navigate("/active");
          }}
        >
          <Plus size={16} aria-hidden="true" /> Quick Start
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Chip
          active={range === "all"}
          onClick={() => setRange("all")}
          label="All time"
        />
        <Chip
          active={range === "week"}
          onClick={() => setRange("week")}
          label="This week"
        />
        <Chip
          active={range === "month"}
          onClick={() => setRange("month")}
          label="This month"
        />
        <Chip
          active={range === "3months"}
          onClick={() => setRange("3months")}
          label="3 months"
        />
        <span className="mx-1 w-px shrink-0 bg-border" aria-hidden="true" />
        <Chip
          active={workoutFilter === "all"}
          onClick={() => setWorkoutFilter("all")}
          label="All workouts"
        />
        {workoutNames.map((n) => (
          <Chip
            key={n}
            active={workoutFilter === n}
            onClick={() => setWorkoutFilter(n)}
            label={n}
          />
        ))}
      </div>

      {sessions.loading ? null : filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="No workouts yet"
          description="Completed workouts will appear here with all your sets and stats."
        />
      ) : (
        <div className="space-y-5">
          {grouped.map(([dayLabel, daySessions]) => (
            <section key={dayLabel} aria-label={dayLabel}>
              <h2 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {formatDateShort(daySessions[0].startedAt)}
              </h2>
              <ul className="space-y-2">
                {daySessions.map((s) => {
                  const volume = s.exercises.reduce(
                    (v, ex) => v + exerciseVolume(ex.sets),
                    0,
                  );
                  const durationMs = (s.endedAt ?? s.startedAt) - s.startedAt;
                  const setsDone = s.exercises.reduce(
                    (n, ex) => n + ex.sets.length,
                    0,
                  );
                  return (
                    <li key={s.id}>
                      <Link
                        to={`/history/${s.id}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 font-semibold">
                            <span className="truncate">{s.templateName ?? "Custom Workout"}</span>
                            {s.prCount > 0 && (
                              <span
                                className="shrink-0 text-sm"
                                title={`${s.prCount} personal records`}
                                aria-label={`${s.prCount} personal records`}
                              >
                                🏆×{s.prCount}
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                            {formatDuration(durationMs)} · {setsDone} sets ·{" "}
                            {formatWeight(volume, unit)}
                          </p>
                        </div>
                        <ChevronRight
                          size={18}
                          className="shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={active}
      onClick={onClick}
      className={
        "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring " +
        (active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border text-muted-foreground hover:bg-muted")
      }
    >
      {label}
    </button>
  );
}
