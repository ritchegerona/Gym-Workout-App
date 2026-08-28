import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Link2,
  Plus,
  Save,
  Trash2,
  Unlink,
} from "lucide-react";
import { getTemplate, saveTemplate } from "../../db/templates";
import { useSettings } from "../../stores/settings";
import { uid } from "../../db/db";
import type { Exercise, WorkoutExercise, WorkoutTemplate } from "../../types";
import { buildSupersetBlocks } from "../../utils/supersets";
import { suggestRestSec } from "../../utils/calculations";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { EmptyState } from "../../components/ui/EmptyState";
import { ExercisePickerDialog } from "../../components/exercise/ExercisePickerDialog";
import { useToast } from "../../components/ui/Toast";

export default function WorkoutBuilderPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const defaultRest = useSettings((s) => s.defaultRestSec);
  const smartRestDefaults = useSettings((s) => s.smartRestDefaults);

  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const existingRef = useRef<WorkoutTemplate | null>(null);

  useEffect(() => {
    if (!id) {
      setLoaded(true);
      return;
    }
    getTemplate(id).then((t) => {
      if (t) {
        existingRef.current = t;
        setName(t.name);
        setExercises(t.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })));
      }
      setLoaded(true);
    });
  }, [id]);

  function updateExercise(idx: number, patch: Partial<WorkoutExercise>) {
    setExercises((exs) =>
      exs.map((e, i) => (i === idx ? { ...e, ...patch } : e)),
    );
  }

  /** Apply a config change to all sets of an exercise (builder-level defaults). */
  function applyToAllSets(
    idx: number,
    patch: Partial<{ targetReps: number; targetWeight: number; restSec: number }>,
  ) {
    setExercises((exs) =>
      exs.map((e, i) =>
        i === idx
          ? {
              ...e,
              ...patch,
              sets: e.sets.map((s) => ({ ...s, ...patch })),
            }
          : e,
      ),
    );
  }

  function addSelected(selected: Exercise[]) {
    setExercises((exs) => [
      ...exs,
      ...selected.map((ex) => ({
        exerciseId: ex.id,
        name: ex.name,
        sets: [
          {
            targetReps: 10,
            targetWeight: 20,
            restSec: smartRestDefaults ? suggestRestSec(ex) : defaultRest,
          },
        ],
      })),
    ]);
    setPickerOpen(false);
  }

  function move(idx: number, dir: -1 | 1) {
    setExercises((exs) => {
      const j = idx + dir;
      if (j < 0 || j >= exs.length) return exs;
      const next = [...exs];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  /** Merge the exercise at idx into a superset with the one before it. */
  function groupWithPrevious(idx: number) {
    setExercises((exs) => {
      const prev = exs[idx - 1];
      if (!prev || idx === 0) return exs;
      const gid = prev.supersetGroup ?? uid();
      return exs.map((e, i) =>
        i === idx || i === idx - 1 ? { ...e, supersetGroup: gid } : e,
      );
    });
  }

  function ungroup(idx: number) {
    setExercises((exs) =>
      exs.map((e, i) => (i === idx ? { ...e, supersetGroup: null } : e)),
    );
  }

  function handleSave() {
    if (!name.trim()) {
      toast("warning", "Give your workout a name first");
      return;
    }
    if (exercises.length === 0) {
      toast("warning", "Add at least one exercise");
      return;
    }
    const existing = existingRef.current;
    const template: WorkoutTemplate = {
      id: id ?? uid(),
      name: name.trim(),
      exercises,
      favorite: existing?.favorite ?? false,
      createdAt: existing?.createdAt ?? Date.now(),
      lastPerformedAt: existing?.lastPerformedAt ?? null,
    };
    saveTemplate(template)
      .then(() => {
        toast("success", `“${template.name}” saved`);
        navigate("/workouts");
      })
      .catch(() => {
        toast("error", "Could not save workout. Please try again.");
      });
  }

  if (!loaded) return null;

  const blocks = buildSupersetBlocks(
    exercises.map((we, idx) => ({ supersetGroup: we.supersetGroup ?? null, idx })),
  );
  const letterByIndex = new Map<number, string>();
  for (const block of blocks) {
    for (const entry of block.items) {
      letterByIndex.set(entry.item.idx, entry.letter);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} aria-hidden="true" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight">
          {id ? "Edit Workout" : "Create Workout"}
        </h1>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Workout name</span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Push Day"
          maxLength={60}
          autoFocus={!id}
        />
      </label>

      {/* Exercise list */}
      {exercises.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No exercises yet"
          description="Add exercises from the library to build this workout."
        />
      ) : (
        <ul className="space-y-3" aria-label="Workout exercises">
          {exercises.map((we, idx) => (
            <li key={`${we.exerciseId}-${idx}`}>
              <BuilderExerciseCard
                index={idx}
                total={exercises.length}
                exercise={we}
                letter={letterByIndex.get(idx) ?? "A"}
                onChange={(patch) => updateExercise(idx, patch)}
                onApplyAll={(patch) => applyToAllSets(idx, patch)}
                onMove={move}
                onGroup={() => groupWithPrevious(idx)}
                onUngroup={() => ungroup(idx)}
                onRemove={() =>
                  setExercises((exs) => exs.filter((_, i) => i !== idx))
                }
              />
            </li>
          ))}
        </ul>
      )}

      <Button variant="outline" size="lg" className="w-full" onClick={() => setPickerOpen(true)}>
        <Plus size={18} aria-hidden="true" /> Add Exercise
      </Button>

      <div className="sticky bottom-20 z-30 md:bottom-4">
        <Button size="lg" className="w-full shadow-xl" onClick={handleSave}>
          <Save size={18} aria-hidden="true" /> Save Workout
        </Button>
      </div>

      <ExercisePickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={addSelected}
        excludeIds={exercises.map((e) => e.exerciseId)}
      />
    </div>
  );
}

function BuilderExerciseCard({
  index,
  total,
  exercise,
  letter,
  onChange,
  onApplyAll,
  onMove,
  onGroup,
  onUngroup,
  onRemove,
}: {
  index: number;
  total: number;
  exercise: WorkoutExercise;
  letter: string;
  onChange: (patch: Partial<WorkoutExercise>) => void;
  onApplyAll: (patch: Partial<{ targetReps: number; targetWeight: number; restSec: number }>) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onRemove: () => void;
}) {
  const first = exercise.sets[0];
  const [setsCount, setSetsCount] = useState(exercise.sets.length);
  const grouped = !!exercise.supersetGroup;

  useEffect(() => {
    setSetsCount(exercise.sets.length);
  }, [exercise.sets.length]);

  function changeSetCount(n: number) {
    const clamped = Math.max(1, Math.min(12, n));
    setSetsCount(clamped);
    const template = first ?? { targetReps: 10, targetWeight: 20, restSec: 90 };
    const sets = Array.from({ length: clamped }, () => ({ ...template }));
    onChange({ sets });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-muted-foreground">
            {grouped ? (
              <span className="flex items-center gap-1.5 text-primary">
                <Link2 size={12} aria-hidden="true" />
                Superset {letter} · Exercise {index + 1} of a block
              </span>
            ) : (
              <>Exercise {index + 1}</>
            )}
          </p>
          <h3 className="truncate font-semibold">{exercise.name}</h3>
        </div>
        <div className="flex shrink-0 gap-1">
          {grouped ? (
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Break superset for ${exercise.name}`}
              onClick={onUngroup}
              className="h-9 w-9 px-0 text-primary"
              title="Break superset"
            >
              <Unlink size={16} aria-hidden="true" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Start superset with ${exercise.name}`}
              disabled={index === 0}
              onClick={onGroup}
              className="h-9 w-9 px-0"
              title="Make this a superset with the previous exercise"
            >
              <Link2 size={16} aria-hidden="true" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Move ${exercise.name} up`}
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
            className="h-9 w-9 px-0"
          >
            <ChevronUp size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Move ${exercise.name} down`}
            disabled={index === total - 1}
            onClick={() => onMove(index, 1)}
            className="h-9 w-9 px-0"
          >
            <ChevronDown size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Remove ${exercise.name}`}
            onClick={onRemove}
            className="h-9 w-9 px-0 text-destructive"
          >
            <Trash2 size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {grouped && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-primary/[0.06] px-2.5 py-2 text-xs leading-relaxed text-muted-foreground">
          <Link2 size={13} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <span>
            This exercise shares a block with the one above. In the workout,
            complete one set of each exercise (A, B…) before resting — that's
            one round.
          </span>
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NumberField
          label="Sets"
          value={setsCount}
          min={1}
          max={12}
          onChange={changeSetCount}
        />
        <NumberField
          label="Reps"
          value={first?.targetReps ?? 10}
          min={1}
          max={100}
          suffix=""
          onChange={(v) => onApplyAll({ targetReps: v })}
        />
        <NumberField
          label="Weight (kg)"
          value={first?.targetWeight ?? 0}
          min={0}
          max={1000}
          step={2.5}
          onChange={(v) => onApplyAll({ targetWeight: v })}
        />
        <NumberField
          label="Rest (sec)"
          value={first?.restSec ?? 90}
          min={10}
          max={600}
          step={15}
          onChange={(v) => onApplyAll({ restSec: v })}
        />
      </div>
    </div>
  );
}

export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex h-11 items-center rounded-xl border border-input bg-card">
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(clamp(value - step))}
          className="h-full w-9 shrink-0 rounded-l-xl text-lg font-bold text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          −
        </button>
        <input
          type="number"
          inputMode="decimal"
          aria-label={label}
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) onChange(clamp(v));
          }}
          onBlur={(e) => {
            const v = parseFloat(e.target.value);
            onChange(Number.isNaN(v) ? min : clamp(v));
          }}
          className="h-full w-full min-w-0 bg-transparent text-center font-mono text-sm font-semibold tabular-nums outline-none"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Increase ${label}`}
          onClick={() => onChange(clamp(value + step))}
          className="h-full w-9 shrink-0 rounded-r-xl text-lg font-bold text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          +
        </button>
      </div>
      {suffix && <span className="sr-only">{suffix}</span>}
    </div>
  );
}
