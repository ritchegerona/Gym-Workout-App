import { useEffect, useRef, useState } from "react";
import { EQUIPMENT_TYPES, MUSCLE_GROUPS } from "../../data/exercises";
import { cn } from "../../lib/utils";
import { useRadiogroupArrows } from "../../hooks/useRadiogroupArrows";
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
  /** Persist the exercise. Caller resolves id (create vs update). */
  onSave: (ex: Omit<Exercise, "id">) => Promise<void>;
  initial?: Exercise | null;
  saving?: boolean;
}

export function ExerciseFormDialog({
  open,
  onClose,
  onSave,
  initial = null,
  saving = false,
}: Props) {
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>("Chest");
  const [secondary, setSecondary] = useState<MuscleGroup[]>([]);
  const [equipment, setEquipment] = useState<Equipment>("Barbell");
  const [type, setType] = useState<ExerciseType>("Compound");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  useRadiogroupArrows(typeRef);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setMuscleGroup(initial?.muscleGroup ?? "Chest");
    setSecondary(initial?.secondaryMuscles ?? []);
    setEquipment(initial?.equipment ?? "Barbell");
    setType(initial?.type ?? "Compound");
    setInstructions(initial?.instructions ?? "");
    setError(null);
  }, [open, initial]);

  function toggleSecondary(m: MuscleGroup) {
    setSecondary((cur) =>
      cur.includes(m)
        ? cur.filter((x) => x !== m)
        : m === muscleGroup
          ? cur
          : [...cur, m],
    );
  }

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the exercise a name");
      return;
    }
    const cleanedSecondary = secondary.filter((m) => m !== muscleGroup);
    try {
      await onSave({
        name: trimmed,
        muscleGroup,
        secondaryMuscles: cleanedSecondary,
        equipment,
        type,
        instructions: instructions.trim(),
      });
      onClose();
    } catch {
      setError("Could not save the exercise. Please try again.");
    }
  }

  const title = initial ? "Edit Exercise" : "New Exercise";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : initial ? "Save Changes" : "Add Exercise"}
          </Button>
        </div>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Exercise name</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Deficit Push Up"
            maxLength={60}
            autoFocus
            aria-label="Exercise name"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Muscle group</span>
            <Select
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}
              aria-label="Primary muscle group"
            >
              {MUSCLE_GROUPS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Equipment</span>
            <Select
              value={equipment}
              onChange={(e) => setEquipment(e.target.value as Equipment)}
              aria-label="Equipment"
            >
              {EQUIPMENT_TYPES.map((eq) => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </Select>
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Type</span>
          <div
            ref={typeRef}
            role="radiogroup"
            aria-label="Exercise type"
            className="flex gap-2"
          >
            {(["Compound", "Isolation"] as ExerciseType[]).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => setType(t)}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  type === t
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </label>

        <div className="space-y-1.5">
          <span className="text-sm font-medium">Secondary muscles</span>
          <div
            role="group"
            aria-label="Secondary muscles"
            className="flex flex-wrap gap-1.5"
          >
            {MUSCLE_GROUPS.map((m) => {
              const active = secondary.includes(m);
              const primary = m === muscleGroup;
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={active}
                  disabled={primary}
                  onClick={() => toggleSecondary(m)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40",
                    active
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Instructions</span>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="How to perform this exercise…"
            rows={3}
            aria-label="Instructions"
            maxLength={500}
            className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-base placeholder:text-muted-foreground focus:border-primary focus:outline-2 focus:outline-ring"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        )}
      </form>
    </Dialog>
  );
}