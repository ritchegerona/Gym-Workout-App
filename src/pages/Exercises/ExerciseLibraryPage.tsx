import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  deleteExercise,
  exerciseInUse,
  getAllExercises,
  isCustomExercise,
  makeCustomExerciseId,
  saveCustomExercise,
} from "../../db/exercises";
import { MUSCLE_GROUPS, EQUIPMENT_TYPES } from "../../data/exercises";
import { useAsync } from "../../hooks/useAsync";
import { cn } from "../../lib/utils";
import type { Equipment, Exercise, ExerciseType, MuscleGroup } from "../../types";
import { Dialog } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { ExerciseFormDialog } from "../../components/exercise/ExerciseFormDialog";
import { useToast } from "../../components/ui/Toast";
import { useRadiogroupArrows } from "../../hooks/useRadiogroupArrows";

export default function ExerciseLibraryPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const all = useAsync(getAllExercises, []);
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "all">("all");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");
  const [type, setType] = useState<ExerciseType | "all">("all");
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
  const [inUseChecked, setInUseChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (all.data ?? []).filter(
      (e) =>
        (muscle === "all" || e.muscleGroup === muscle) &&
        (equipment === "all" || e.equipment === equipment) &&
        (type === "all" || e.type === type) &&
        (q === "" ||
          e.name.toLowerCase().includes(q) ||
          e.muscleGroup.toLowerCase().includes(q)),
    );
  }, [all.data, search, muscle, equipment, type]);

  async function handleSave(ex: Omit<Exercise, "id">) {
    setSaving(true);
    try {
      const payload: Exercise = editing
        ? { ...editing, ...ex }
        : { ...ex, id: makeCustomExerciseId() };
      await saveCustomExercise(payload);
      toast(
        "success",
        editing ? "Exercise updated" : `“${payload.name}” added`,
      );
      all.reload();
      setFormOpen(false);
      if (editing) setDetail(payload);
    } finally {
      setSaving(false);
      setEditing(null);
    }
  }

  async function openEdit(ex: Exercise) {
    setDetail(null);
    setEditing(ex);
    setFormOpen(true);
  }

  async function requestDelete(ex: Exercise) {
    setDetail(null);
    setInUseChecked(await exerciseInUse(ex.id));
    setDeleteTarget(ex);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteExercise(deleteTarget.id);
    toast("info", `“${deleteTarget.name}” deleted`);
    setDeleteTarget(null);
    all.reload();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="rounded-xl p-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring md:hidden"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Exercises</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} exercises
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus size={18} aria-hidden="true" />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </div>

      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises…"
          aria-label="Search exercises"
          className="h-12 w-full rounded-xl border border-input bg-card pl-10 pr-4 outline-none focus:border-primary focus:outline-2 focus:outline-ring"
        />
      </div>

      <div className="space-y-2">
        <FilterRow
          options={["all", ...MUSCLE_GROUPS]}
          value={muscle}
          onChange={(v) => setMuscle(v as MuscleGroup | "all")}
          label="Muscle group filter"
        />
        <FilterRow
          options={["all", ...EQUIPMENT_TYPES]}
          value={equipment}
          onChange={(v) => setEquipment(v as Equipment | "all")}
          label="Equipment filter"
        />
        <FilterRow
          options={["all", "Compound", "Isolation"]}
          value={type}
          onChange={(v) => setType(v as ExerciseType | "all")}
          label="Type filter"
        />
      </div>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((ex) => (
          <li key={ex.id}>
            <button
              onClick={() => setDetail(ex)}
              className="w-full rounded-xl border border-border bg-card p-3.5 text-left shadow-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <p className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold">{ex.name}</span>
                {isCustomExercise(ex.id) && (
                  <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Custom
                  </span>
                )}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {ex.muscleGroup} · {ex.equipment} · {ex.type}
              </p>
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="col-span-full py-12 text-center text-sm text-muted-foreground">
            No exercises match your filters.
          </li>
        )}
      </ul>

      <Dialog
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ""}
        footer={
          detail && isCustomExercise(detail.id) ? (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => requestDelete(detail)}
              >
                <Trash2 size={16} aria-hidden="true" /> Delete
              </Button>
              <Button className="flex-1" onClick={() => openEdit(detail)}>
                <Pencil size={16} aria-hidden="true" /> Edit
              </Button>
            </div>
          ) : undefined
        }
      >
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              {isCustomExercise(detail.id) && <Tag>Custom</Tag>}
              <Tag>{detail.muscleGroup}</Tag>
              {detail.secondaryMuscles.map((m) => (
                <Tag key={m}>{m}</Tag>
              ))}
              <Tag>{detail.equipment}</Tag>
              <Tag>{detail.type}</Tag>
            </div>
            <div>
              <h3 className="mb-1 font-semibold">How to</h3>
              <p className="leading-relaxed text-muted-foreground">
                {detail.instructions || "No instructions yet."}
              </p>
            </div>
          </div>
        )}
      </Dialog>

      <ExerciseFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        initial={editing}
        saving={saving}
        onSave={handleSave}
      />

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete this exercise?"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">{deleteTarget?.name}</strong> will
          be removed from your library.
          {inUseChecked
            ? " It is still used by one or more workouts or past sessions — those records keep their exercise name."
            : " No saved workouts or sessions use it."}
        </p>
      </Dialog>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function FilterRow({
  options,
  value,
  onChange,
  label,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useRadiogroupArrows(ref);
  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((opt) => (
        <button
          key={opt}
          role="radio"
          aria-checked={value === opt}
          onClick={() => onChange(opt)}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
            value === opt
              ? "border-primary bg-primary/15 text-primary"
              : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          {opt === "all" ? "All" : opt}
        </button>
      ))}
    </div>
  );
}
