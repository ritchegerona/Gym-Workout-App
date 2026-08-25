import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Trophy } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getSession } from "../../db/sessions";
import { getRecordsForExercise } from "../../db/records";
import { useSettings } from "../../stores/settings";
import {
  countCompletedSets,
  exerciseVolume,
  totalSessionVolume,
} from "../../utils/calculations";
import { formatDate, formatDuration, formatNumber } from "../../utils/format";
import { formatWeight } from "../../utils/units";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import type { SessionExercise } from "../../types";

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const unit = useSettings((s) => s.unit);
  const session = useAsync(
    () => (id ? getSession(id) : Promise.resolve(undefined)),
    [id],
  );

  if (session.loading) return null;
  const s = session.data;
  if (!s) {
    return (
      <div className="mx-auto max-w-md pt-8">
        <EmptyState
          icon={Pencil}
          title="Workout not found"
          description="This session may have been removed."
        />
        <Button size="lg" className="mt-4 w-full" onClick={() => navigate("/history")}>
          Back to History
        </Button>
      </div>
    );
  }

  const durationMs = (s.endedAt ?? s.startedAt) - s.startedAt;
  const volume = totalSessionVolume(s.exercises);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/history")}
          aria-label="Back to history"
          className="rounded-xl p-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold tracking-tight">
            {s.templateName ?? "Custom Workout"}
          </h1>
          <p className="text-sm text-muted-foreground">{formatDate(s.startedAt)}</p>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Duration" value={formatDuration(durationMs)} />
        <Stat
          label="Sets"
          value={String(countCompletedSets(s.exercises))}
        />
        <Stat label="Volume" value={`${formatNumber(volume)} ${unit}`} />
      </dl>

      {s.exercises.map((ex) => (
        <SessionExerciseBlock key={ex.exerciseId} exercise={ex} unit={unit} sessionId={s.id} />
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function SessionExerciseBlock({
  exercise,
  unit,
  sessionId,
}: {
  exercise: SessionExercise;
  unit: "kg" | "lb";
  sessionId: string;
}) {
  const prs = useAsync(() => getRecordsForExercise(exercise.exerciseId), [
    exercise.exerciseId,
  ]);
  const sessionPRs = (prs.data ?? []).filter((r) => r.sessionId === sessionId);
  const vol = exerciseVolume(exercise.sets);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-2 px-4 py-3">
        <h2 className="truncate font-semibold">{exercise.name}</h2>
        {sessionPRs.length > 0 && (
          <Link
            to="/progress"
            className="flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary"
            aria-label={`${sessionPRs.length} personal records in this exercise`}
          >
            <Trophy size={12} aria-hidden="true" /> {sessionPRs.length} PR
            {sessionPRs.length > 1 ? "s" : ""}
          </Link>
        )}
      </header>

      {/* Desktop-style table */}
      <table className="hidden w-full px-4 text-sm sm:table">
        <thead>
          <tr className="border-y border-border/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2 font-semibold">Set</th>
            <th className="px-4 py-2 font-semibold">Weight</th>
            <th className="px-4 py-2 font-semibold">Reps</th>
            <th className="px-4 py-2 text-right font-semibold">Volume</th>
          </tr>
        </thead>
        <tbody>
          {exercise.sets.map((st, i) => (
            <tr key={i} className="border-b border-border/40 last:border-0">
              <td className="px-4 py-2 font-mono tabular-nums">{i + 1}</td>
              <td className="px-4 py-2 font-mono tabular-nums">
                {formatWeight(st.weight, unit)}
              </td>
              <td className="px-4 py-2 font-mono tabular-nums">{st.reps}</td>
              <td className="px-4 py-2 text-right font-mono tabular-nums text-muted-foreground">
                {Math.round(st.weight * st.reps)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="px-4 pb-3 pt-1 text-xs text-muted-foreground">
              Exercise volume
            </td>
            <td className="px-4 pb-3 pt-1 text-right font-semibold tabular-nums">
              {formatWeight(vol, unit)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Mobile stacked set rows */}
      <ol className="divide-y divide-border/50 sm:hidden">
        {exercise.sets.map((st, i) => (
          <li key={i} className="flex items-center justify-between px-4 py-2.5">
            <span className="w-8 font-mono text-sm font-bold text-muted-foreground tabular-nums">
              {i + 1}
            </span>
            <span className="font-mono text-sm font-semibold tabular-nums">
              {formatWeight(st.weight, unit)} × {st.reps}
            </span>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {Math.round(st.weight * st.reps)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
