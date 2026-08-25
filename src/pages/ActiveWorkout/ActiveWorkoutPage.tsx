import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  ChevronDown,
  Dumbbell,
  Flag,
  History as HistoryIcon,
  Plus,
  Timer as TimerIcon,
  Trash2,
  X,
} from "lucide-react";
import {
  useActiveWorkout,
} from "../../stores/activeWorkout";
import { useSettings, REST_PRESETS } from "../../stores/settings";
import { useRestTimer } from "../../hooks/useRestTimer";
import { useWakeLock } from "../../hooks/useWakeLock";
import { getFinishedSessions } from "../../db/sessions";
import { getBestRecords } from "../../db/records";
import { finishWorkout } from "../../services/workoutService";
import { getTemplate, saveTemplate } from "../../db/templates";
import {
  estimate1RM,
  detectSetPRs,
  totalSessionVolume,
} from "../../utils/calculations";
import { formatClock, formatDuration } from "../../utils/format";
import { formatWeight } from "../../utils/units";
import type { SetRecord } from "../../types";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { ExercisePickerDialog } from "../../components/exercise/ExercisePickerDialog";
import { useToast } from "../../components/ui/Toast";
import { cn } from "../../lib/utils";

interface PrevBests {
  [exerciseId: string]: { weight: number; oneRm: number; setVol: number };
}

export default function ActiveWorkoutPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const unit = useSettings((s) => s.unit);

  const sessionId = useActiveWorkout((s) => s.sessionId);
  const name = useActiveWorkout((s) => s.name);
  const startedAt = useActiveWorkout((s) => s.startedAt);
  const exercises = useActiveWorkout((s) => s.exercises);

  const completeSetStore = useActiveWorkout((s) => s.completeSet);
  const uncompleteSet = useActiveWorkout((s) => s.uncompleteSet);
  const updateSet = useActiveWorkout((s) => s.updateSet);
  const addSet = useActiveWorkout((s) => s.addSet);
  const removeSet = useActiveWorkout((s) => s.removeSet);
  const removeExercise = useActiveWorkout((s) => s.removeExercise);
  const moveExercise = useActiveWorkout((s) => s.moveExercise);
  const setRestForExercise = useActiveWorkout((s) => s.setRestForExercise);
  const discardWorkout = useActiveWorkout((s) => s.discardWorkout);
  const startRest = useActiveWorkout((s) => s.startRest);

  const rest = useRestTimer();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const bestsRef = useRef<PrevBests>({});
  const prevPerfRef = useRef<Map<string, string[]>>(new Map());
  const [loadedHistory, setLoadedHistory] = useState(false);

  // Keep the screen on for the whole session
  useWakeLock(sessionId !== null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getFinishedSessions(), getBestRecords()])
      .then(([sessions, records]) => {
        if (cancelled) return;
        const bests: PrevBests = {};
        for (const r of records) {
          const cur = bests[r.exerciseId] ?? { weight: 0, oneRm: 0, setVol: 0 };
          if (r.type === "max-weight") cur.weight = Math.max(cur.weight, r.weight);
          if (r.type === "best-1rm") cur.oneRm = Math.max(cur.oneRm, r.estimated1RM);
          if (r.type === "best-set-volume") cur.setVol = Math.max(cur.setVol, r.volume);
          bests[r.exerciseId] = cur;
        }
        // Fall back to raw history when no records exist yet
        for (const s of sessions) {
          for (const ex of s.exercises) {
            const b = bests[ex.exerciseId] ?? { weight: 0, oneRm: 0, setVol: 0 };
            for (const st of ex.sets) {
              if (st.completedAt === 0) continue;
              b.weight = Math.max(b.weight, st.weight);
              b.oneRm = Math.max(b.oneRm, estimate1RM(st.weight, st.reps));
              b.setVol = Math.max(
                b.setVol,
                st.weight * st.reps,
              );
            }
            bests[ex.exerciseId] = b;
          }
        }
        // previous performance display: last session per exercise
        for (const s of sessions) {
          for (const ex of s.exercises) {
            if (!prevPerfRef.current.has(ex.exerciseId)) {
              prevPerfRef.current.set(
                ex.exerciseId,
                ex.sets
                  .filter((st) => st.completedAt > 0)
                  .map((st) => `${formatWeight(st.weight, unit)} × ${st.reps}`),
              );
            }
          }
        }
        bestsRef.current = bests;
        setLoadedHistory(true);
      })
      .catch(() => setLoadedHistory(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per mount; unit rarely changes mid-workout
  }, []);

  const totals = useMemo(() => {
    const setsDone = exercises.reduce(
      (n, ex) => n + ex.sets.filter((st) => st.completedAt > 0).length,
      0,
    );
    return {
      setsDone,
      volume: totalSessionVolume(exercises),
    };
  }, [exercises]);

  if (!sessionId || startedAt === null) {
    return (
      <div className="mx-auto max-w-md pt-8">
        <EmptyState
          icon={Dumbbell}
          title="No active workout"
          description="Start a workout from Home or your saved templates."
        />
        <Button size="lg" className="mt-4 w-full" onClick={() => navigate("/workouts")}>
          Browse Workouts
        </Button>
      </div>
    );
  }

  function handleComplete(exIdx: number, setIdx: number, set: SetRecord) {
    const weight = Math.min(10000, Math.max(0, set.weight));
    const reps = Math.min(999, Math.max(0, set.reps));

    // PR check before completing
    const ex = exercises[exIdx];
    const best =
      bestsRef.current[ex.exerciseId] ?? { weight: 0, oneRm: 0, setVol: 0 };
    const candidate: SetRecord = { weight, reps, completedAt: Date.now() };
    const prs = detectSetPRs(candidate, best.weight, best.oneRm, best.setVol);

    const ok = completeSetStore(exIdx, setIdx, weight, reps);
    if (!ok) {
      toast("error", "Please enter a valid weight and rep count");
      return;
    }

    if (prs.length > 0) {
      const label =
        candidate.reps > 0
          ? `${formatWeight(candidate.weight, unit)} × ${candidate.reps}`
          : formatWeight(candidate.weight, unit);
      toast("success", `🏆 New personal record! ${ex.name} — ${label}`);
      bestsRef.current[ex.exerciseId] = {
        weight: Math.max(best.weight, candidate.weight),
        oneRm: Math.max(best.oneRm, estimate1RM(candidate.weight, candidate.reps)),
        setVol: Math.max(best.setVol, candidate.weight * candidate.reps),
      };
    }

    startRest(ex.restSec || 90);
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const state = useActiveWorkout.getState();
      const draft = {
        id: state.sessionId!,
        templateId: state.templateId,
        templateName: state.templateId ? state.name : null,
        startedAt: state.startedAt!,
        exercises: state.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.filter((st) => st.completedAt > 0),
        })),
      };
      const { session } = await finishWorkout(draft);
      // Update template lastPerformedAt
      if (state.templateId) {
        void getTemplate(state.templateId).then(async (t) => {
          if (t) await saveTemplate({ ...t, lastPerformedAt: Date.now() });
        });
      }
      discardWorkout();
      navigate(`/complete/${session.id}`, {
        state: { justFinished: true },
      });
    } catch {
      toast("error", "Could not save workout. Your data is still here.");
      setSaving(false);
    }
  }

  const hasAnyCompleted = totals.setsDone > 0;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Sticky header */}
      <div className="sticky top-[57px] z-30 -mx-4 mb-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:top-0 md:-mx-8 md:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold tracking-tight">{name}</h1>
            <p className="text-xs text-muted-foreground tabular-nums">
              <ElapsedClock startedAt={startedAt} /> · {totals.setsDone} sets ·{" "}
              {formatWeight(totals.volume, unit)}
            </p>
          </div>
          <Button onClick={() => setFinishOpen(true)} disabled={saving}>
            <Flag size={16} aria-hidden="true" /> Finish
          </Button>
        </div>
      </div>

      {/* Rest timer */}
      {rest.isActive && (
        <RestTimerPanel />
      )}

      {/* Exercises */}
      {exercises.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Add your first exercise to begin.
        </p>
      ) : (
        <ul className="space-y-4" aria-label="Exercises in this workout">
          {exercises.map((ex, exIdx) => (
            <li key={`${ex.exerciseId}-${exIdx}`}>
              <ExerciseCard
                key={`${ex.exerciseId}-${exIdx}-${ex.sets.length}`}
                index={exIdx}
                unit={unit}
                name={ex.name}
                restSec={ex.restSec}
                sets={ex.sets}
                prevPerformance={prevPerfRef.current.get(ex.exerciseId)}
                historyLoaded={loadedHistory}
                onMove={(dir) => moveExercise(exIdx, dir)}
                onRemove={() => removeExercise(ex.exerciseId)}
                onSetRest={(sec) => setRestForExercise(exIdx, sec)}
                onUpdate={(setIdx, patch) => updateSet(exIdx, setIdx, patch)}
                onComplete={(setIdx, set) => handleComplete(exIdx, setIdx, set)}
                onUncomplete={(setIdx) => uncompleteSet(exIdx, setIdx)}
                onAddSet={() => addSet(exIdx)}
                onRemoveSet={(setIdx) => removeSet(exIdx, setIdx)}
              />
            </li>
          ))}
        </ul>
      )}

      <Button
        variant="outline"
        size="lg"
        className="mt-3 w-full"
        onClick={() => setPickerOpen(true)}
      >
        <Plus size={18} aria-hidden="true" /> Add Exercise
      </Button>

      <ExercisePickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        excludeIds={exercises.map((e) => e.exerciseId)}
        onConfirm={(selected) => {
          useActiveWorkout.getState().addExercises(
            selected.map((ex) => ({
              exerciseId: ex.id,
              name: ex.name,
              config: { targetReps: 10, targetWeight: 20, restSec: 90 },
            })),
          );
          setPickerOpen(false);
        }}
      />

      {/* Finish dialog */}
      <Dialog
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        title={hasAnyCompleted ? "Finish workout?" : "Nothing recorded yet"}
        footer={
          hasAnyCompleted ? (
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setFinishOpen(false)}>
                Keep Training
              </Button>
              <Button className="flex-1" onClick={handleFinish} disabled={saving}>
                Finish Workout
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setFinishOpen(false)}>
                Continue
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  setFinishOpen(false);
                  setDiscardOpen(true);
                }}
              >
                Discard Workout
              </Button>
            </div>
          )
        }
      >
        {hasAnyCompleted ? (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <SummaryStat label="Duration" value={<ElapsedValue startedAt={startedAt} />} />
            <SummaryStat label="Sets completed" value={String(totals.setsDone)} />
            <SummaryStat label="Volume" value={formatWeight(totals.volume, unit)} />
            <SummaryStat label="Exercises" value={String(exercises.length)} />
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t completed any sets. Discard this workout or keep
            training.
          </p>
        )}
      </Dialog>

      <Dialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="Discard workout?"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setDiscardOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                discardWorkout();
                navigate("/");
              }}
            >
              Discard
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          This will delete the workout and all recorded sets. This cannot be
          undone.
        </p>
      </Dialog>
    </div>
  );
}

function ElapsedClock({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return <span className="font-mono">{formatDuration(now - startedAt)}</span>;
}

function ElapsedValue({ startedAt }: { startedAt: number }) {
  const [now] = useState(() => Date.now());
  return <>{formatDuration(now - startedAt)}</>;
}

function SummaryStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-muted p-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-base font-bold">{value}</dd>
    </div>
  );
}

function RestTimerPanel() {
  const rest = useRestTimer();
  const progress =
    rest.durationSec > 0
      ? 1 - rest.remainingMs / (rest.durationSec * 1000)
      : 0;

  return (
    <section
      aria-label="Rest timer"
      className="mb-4 rounded-2xl border border-primary/40 bg-primary/[0.07] p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <TimerIcon size={14} aria-hidden="true" /> Rest
        </span>
        <button
          onClick={rest.skip}
          className="rounded-lg p-1.5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="Skip rest"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <p
        role="timer"
        className={cn(
          "my-1 text-center font-mono text-6xl font-bold tabular-nums",
          rest.remainingMs === 0 ? "animate-pulse text-primary" : "",
        )}
      >
        {formatClock(rest.remainingMs)}
      </p>
      <div
        className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
        />
      </div>
      <div className="flex items-center justify-center gap-2">
        <Button variant="secondary" onClick={() => rest.subtract(15)}>−15s</Button>
        <Button variant="secondary" onClick={() => rest.add(15)}>+15s</Button>
        <Button onClick={rest.skip}>Skip</Button>
      </div>
    </section>
  );
}

/* ---------------- Exercise card ---------------- */

interface ExerciseCardProps {
  index: number;
  unit: "kg" | "lb";
  name: string;
  restSec: number;
  sets: SetRecord[];
  prevPerformance?: string[];
  historyLoaded: boolean;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onSetRest: (sec: number) => void;
  onUpdate: (setIdx: number, patch: Partial<SetRecord>) => void;
  onComplete: (setIdx: number, set: SetRecord) => void;
  onUncomplete: (setIdx: number) => void;
  onAddSet: () => void;
  onRemoveSet: (setIdx: number) => void;
}

function ExerciseCard({
  index,
  unit,
  name,
  restSec,
  sets,
  prevPerformance,
  onSetRest,
  onUpdate,
  onComplete,
  onUncomplete,
  onAddSet,
  onRemoveSet,
}: ExerciseCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const allDone = sets.length > 0 && sets.every((s) => s.completedAt > 0);

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card shadow-sm",
        allDone ? "border-success/50" : "border-border",
      )}
      aria-label={`Exercise: ${name}`}
    >
      <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-3.5">
        <h2 className="min-w-0 truncate font-semibold">
          <span className="mr-1.5 text-muted-foreground">{index + 1}.</span>
          {name}
        </h2>
        <div className="relative flex shrink-0 items-center gap-1">
          {!allDone && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 px-0"
              aria-label={`Options for ${name}`}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <ChevronDown size={17} aria-hidden="true" />
            </Button>
          )}
        </div>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <div
              role="menu"
              className="absolute right-11 top-10 z-20 w-48 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
            >
              <MenuRow
                icon={Plus}
                label="Add set"
                onClick={() => {
                  setMenuOpen(false);
                  onAddSet();
                }}
              />
              {sets.length > 1 && (
                <MenuRow
                  icon={Trash2}
                  label={`Remove last set (${sets.length})`}
                  danger
                  onClick={() => {
                    setMenuOpen(false);
                    onRemoveSet(sets.length - 1);
                  }}
                />
              )}
            </div>
          </>
        )}
      </header>

      {/* Previous performance */}
      {prevPerformance && prevPerformance.length > 0 && (
        <p className="mx-4 mb-2 flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
          <HistoryIcon size={13} className="shrink-0" aria-hidden="true" />
          <span className="truncate">
            Last: {prevPerformance.slice(0, 5).join(" · ")}
            {prevPerformance.length > 5 ? ` · +${prevPerformance.length - 5}` : ""}
          </span>
        </p>
      )}

      {/* Set rows */}
      <div className="px-2 pb-2">
        <div
          className="grid grid-cols-[26px_1fr_72px_60px_52px] items-end gap-1.5 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          aria-hidden="true"
        >
          <span>Set</span>
          <span className="text-center">Previous</span>
          <span className="text-center">Wt ({unit})</span>
          <span className="text-center">Reps</span>
          <span className="sr-only">Done</span>
        </div>
        <ol className="space-y-1.5">
          {sets.map((set, i) => (
            <li
              key={i}
              className="grid grid-cols-[26px_1fr_72px_60px_52px] items-stretch gap-1.5"
            >
              <span className="flex items-center justify-center font-mono text-sm font-bold text-muted-foreground">
                {i + 1}
              </span>
              <span className="flex items-center justify-center truncate font-mono text-xs text-muted-foreground">
                {prevPerformance?.[i] ?? "—"}
              </span>
              <NumberCell
                value={set.weight}
                step={2.5}
                disabled={set.completedAt > 0}
                ariaLabel={`Weight for set ${i + 1}`}
                onChange={(v) => onUpdate(i, { weight: v })}
              />
              <NumberCell
                value={set.reps}
                step={1}
                disabled={set.completedAt > 0}
                ariaLabel={`Reps for set ${i + 1}`}
                onChange={(v) => onUpdate(i, { reps: v })}
              />
              <CompleteButton
                completed={set.completedAt > 0}
                onClick={() =>
                  set.completedAt > 0 ? onUncomplete(i) : onComplete(i, set)
                }
                label={
                  set.completedAt > 0
                    ? `Mark set ${i + 1} incomplete`
                    : `Complete set ${i + 1}`
                }
              />
            </li>
          ))}
        </ol>
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-2.5">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Rest
          <select
            value={restSec}
            onChange={(e) => onSetRest(Number(e.target.value))}
            className="rounded-lg border border-input bg-background px-2 py-1 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={`Rest time for ${name}`}
          >
            {[...new Set([...REST_PRESETS, restSec])].sort((a, b) => a - b).map((r) => (
              <option key={r} value={r}>{r}s</option>
            ))}
          </select>
        </label>
        <Button variant="secondary" size="sm" onClick={onAddSet}>
          <Plus size={14} aria-hidden="true" /> Add Set
        </Button>
      </footer>
    </section>
  );
}

function MenuRow({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: typeof Plus;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium hover:bg-muted",
        danger && "text-destructive",
      )}
    >
      <Icon size={15} aria-hidden="true" /> {label}
    </button>
  );
}

function NumberCell({
  value,
  step,
  disabled,
  ariaLabel,
  onChange,
}: {
  value: number;
  step: number;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      disabled={disabled}
      aria-label={ariaLabel}
      min={0}
      value={value === 0 ? "" : value}
      placeholder="0"
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        onChange(Number.isNaN(v) ? 0 : Math.max(0, v));
      }}
      onBlur={(e) => {
        if (e.target.value === "") onChange(0);
      }}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          onChange(value + step);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          onChange(Math.max(0, value - step));
        }
      }}
      className={cn(
        "h-12 w-full rounded-xl border border-input bg-card text-center font-mono text-base font-semibold tabular-nums outline-none",
        "focus:border-primary focus:outline-2 focus:outline-ring",
        disabled && "bg-muted text-muted-foreground opacity-70",
      )}
    />
  );
}

function CompleteButton({
  completed,
  onClick,
  label,
}: {
  completed: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={completed}
      className={cn(
        "flex h-12 items-center justify-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        completed
          ? "bg-success/20 text-success"
          : "bg-primary text-primary-foreground hover:opacity-90 active:opacity-80",
      )}
    >
      {completed ? <Check size={22} strokeWidth={3} aria-hidden="true" /> : <Check size={22} strokeWidth={2.5} aria-hidden="true" />}
    </button>
  );
}
