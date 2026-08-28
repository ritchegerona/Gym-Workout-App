import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { getAllExercises } from "../../db/exercises";
import { MUSCLE_GROUPS, EQUIPMENT_TYPES } from "../../data/exercises";
import { useAsync } from "../../hooks/useAsync";
import { cn } from "../../lib/utils";
import type {
  Equipment,
  Exercise,
  ExerciseType,
  MuscleGroup,
} from "../../types";
import { Dialog } from "../ui/Dialog";
import { Input, Select } from "../ui/Input";
import { Button } from "../ui/Button";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (selected: Exercise[]) => void;
  excludeIds?: string[];
  /** Single-select mode for actions like mid-workout swap. */
  single?: boolean;
  confirmLabel?: string;
}

export function ExercisePickerDialog({
  open,
  onClose,
  onConfirm,
  excludeIds = [],
  single = false,
  confirmLabel = "Add",
}: Props) {
  const all = useAsync(getAllExercises, []);
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "all">("all");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ExerciseType | "all">("all");
  const [selected, setSelected] = useState<Exercise[]>([]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (all.data ?? []).filter(
      (e) =>
        !excludeIds.includes(e.id) &&
        (muscle === "all" || e.muscleGroup === muscle) &&
        (equipment === "all" || e.equipment === equipment) &&
        (typeFilter === "all" || e.type === typeFilter) &&
        (q === "" || e.name.toLowerCase().includes(q)),
    );
  }, [all.data, search, muscle, equipment, typeFilter, excludeIds]);

  function toggle(ex: Exercise) {
    setSelected((sel) =>
      sel.some((s) => s.id === ex.id)
        ? sel.filter((s) => s.id !== ex.id)
        : single
          ? [ex]
          : [...sel, ex],
    );
  }

  function close() {
    setSelected([]);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={single ? "Swap Exercise" : "Add Exercises"}
      footer={
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {selected.length} selected
          </span>
          <Button
            className="ml-auto min-w-32"
            disabled={selected.length === 0}
            onClick={() => {
              onConfirm(selected);
              setSelected([]);
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Input
          placeholder="Search exercises…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search exercises"
        />
        <div className="grid grid-cols-3 gap-2">
          <Select
            aria-label="Filter by muscle group"
            value={muscle}
            onChange={(e) => setMuscle(e.target.value as MuscleGroup | "all")}
          >
            <option value="all">All muscles</option>
            {MUSCLE_GROUPS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
          <Select
            aria-label="Filter by equipment"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value as Equipment | "all")}
          >
            <option value="all">All equipment</option>
            {EQUIPMENT_TYPES.map((eq) => (
              <option key={eq} value={eq}>{eq}</option>
            ))}
          </Select>
          <Select
            aria-label="Filter by exercise type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ExerciseType | "all")}
          >
            <option value="all">All types</option>
            <option value="Compound">Compound</option>
            <option value="Isolation">Isolation</option>
          </Select>
        </div>

        <ul className="space-y-1.5">
          {filtered.map((ex) => {
            const isSel = selected.some((s) => s.id === ex.id);
            return (
              <li key={ex.id}>
                <button
                  onClick={() => toggle(ex)}
                  aria-pressed={isSel}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors",
                    isSel
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{ex.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {ex.muscleGroup} · {ex.equipment} · {ex.type}
                    </span>
                  </span>
                  {isSel ? (
                    <X size={16} className="shrink-0 text-primary" aria-hidden="true" />
                  ) : (
                    <Plus size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="py-8 text-center text-sm text-muted-foreground">
              No exercises match your filters.
            </li>
          )}
        </ul>
      </div>
    </Dialog>
  );
}
