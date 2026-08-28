import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, ChevronRight, History, Plus, Trash2 } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getFinishedSessions } from "../../db/sessions";
import { deleteCardioEntry, getAllCardio } from "../../db/cardio";
import { useToast } from "../../components/ui/Toast";
import { CardioLogDialog } from "../../components/cardio/CardioLogDialog";
import { exerciseVolume } from "../../utils/calculations";
import { formatDateShort, formatDuration, relativeDate } from "../../utils/format";
import { formatWeight } from "../../utils/units";
import { useSettings } from "../../stores/settings";
import { useActiveWorkout } from "../../stores/activeWorkout";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import type { CardioEntry, WorkoutSession } from "../../types";

type RangeFilter = "all" | "week" | "month" | "3months";

type HistoryRow =
  | { kind: "workout"; id: string; session: WorkoutSession }
  | { kind: "cardio"; id: string; entry: CardioEntry };

function rowDate(r: HistoryRow): number {
  return r.kind === "workout" ? r.session.startedAt : r.entry.date;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const unit = useSettings((s) => s.unit);
  const sessions = useAsync(getFinishedSessions, []);
  const cardio = useAsync(getAllCardio, []);
  const [range, setRange] = useState<RangeFilter>("all");
  const [workoutFilter, setWorkoutFilter] = useState<string>("all");
  const [showCardio, setShowCardio] = useState(false);

  const rangeDays = range === "week" ? 7 : range === "month" ? 30 : 90;

  const rows: HistoryRow[] = useMemo(() => {
    const list: HistoryRow[] = [];
    for (const s of sessions.data ?? []) {
      if (range !== "all" && s.startedAt < Date.now() - rangeDays * 86_400_000)
        continue;
      if (workoutFilter !== "all" && (s.templateName ?? "Custom") !== workoutFilter)
        continue;
      list.push({ kind: "workout", id: "w-" + s.id, session: s });
    }
    for (const c of cardio.data ?? []) {
      if (range !== "all" && c.date < Date.now() - rangeDays * 86_400_000)
        continue;
      list.push({ kind: "cardio", id: "c-" + c.id, entry: c });
    }
    return list.sort((a, b) => rowDate(b) - rowDate(a));
  }, [sessions.data, cardio.data, range, workoutFilter, rangeDays]);

  // Group by date string
  const grouped = useMemo(() => {
    const map = new Map<string, HistoryRow[]>();
    for (const r of rows) {
      const key = new Date(rowDate(r)).toDateString();
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [rows]);

  const workoutNames = useMemo(() => {
    const names = new Set<string>();
    for (const s of sessions.data ?? []) names.add(s.templateName ?? "Custom");
    return [...names].sort();
  }, [sessions.data]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowCardio(true)}>
            <Activity size={16} aria-hidden="true" /> Log Cardio
          </Button>
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

      {sessions.loading && cardio.loading ? null : rows.length === 0 ? (
        <EmptyState
          icon={History}
          title="No activity yet"
          description="Completed workouts and cardio sessions will appear here."
        />
      ) : (
        <div className="space-y-5">
          {grouped.map(([dayLabel, dayRows]) => (
            <section key={dayLabel} aria-label={dayLabel}>
              <h2 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {formatDateShort(rowDate(dayRows[0]))}
              </h2>
              <ul className="space-y-2">
                {dayRows.map((r) =>
                  r.kind === "cardio" ? (
                    <CardioRow
                      key={r.id}
                      entry={r.entry}
                      onDelete={async () => {
                        await deleteCardioEntry(r.entry.id);
                        toast("info", `${r.entry.activity} entry deleted`);
                      }}
                    />
                  ) : (
                    <WorkoutRow key={r.id} session={r.session} unit={unit} />
                  ),
                )}
              </ul>
            </section>
          ))}
        </div>
      )}

      <CardioLogDialog open={showCardio} onClose={() => setShowCardio(false)} />
    </div>
  );
}

function WorkoutRow({
  session: s,
  unit,
}: {
  session: WorkoutSession;
  unit: "kg" | "lb";
}) {
  const volume = s.exercises.reduce((v, ex) => v + exerciseVolume(ex.sets), 0);
  const durationMs = (s.endedAt ?? s.startedAt) - s.startedAt;
  const setsDone = s.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  return (
    <li>
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
}

function CardioRow({
  entry,
  onDelete,
}: {
  entry: CardioEntry;
  onDelete: () => void;
}) {
  const parts = [
    entry.distanceKm ? `${entry.distanceKm.toFixed(1)} km` : null,
    entry.calories ? `${entry.calories} kcal` : null,
    relativeDate(entry.date),
  ].filter(Boolean) as string[];
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary sm:flex">
          <Activity size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold">
            <span className="truncate">{entry.activity}</span>
            {entry.notes && (
              <span className="hidden truncate text-xs font-normal text-muted-foreground sm:inline">
                — {entry.notes}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {formatDuration(entry.durationMin * 60_000)}
            {parts.length > 0 && <> · {parts.join(" · ")}</>}
          </p>
        </div>
      </div>
      <button
        onClick={onDelete}
        aria-label={`Delete ${entry.activity} entry`}
        className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </li>
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
