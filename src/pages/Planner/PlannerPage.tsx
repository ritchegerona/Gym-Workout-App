import { useRef, useState } from "react";
import { CalendarDays, Dumbbell, HeartPulse, Plus, Trash2 } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getAllTemplates } from "../../db/templates";
import { useSettings } from "../../stores/settings";
import { CARDIO_ACTIVITIES } from "../../data/cardio";
import { Dialog } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { useRadiogroupArrows } from "../../hooks/useRadiogroupArrows";
import type { PlanItemType, WeeklyPlanEntry } from "../../types";

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function toJsDay(displayIndex: number): number {
  return (displayIndex + 1) % 7;
}

export default function PlannerPage() {
  const weeklyPlan = useSettings((s) => s.weeklyPlan);
  const setPlanEntry = useSettings((s) => s.setPlanEntry);
  const removePlanEntry = useSettings((s) => s.removePlanEntry);
  const templates = useAsync(getAllTemplates, []);

  const [editDay, setEditDay] = useState<number | null>(null);

  const todayJs = new Date().getDay();
  const todayIndex = (todayJs + 6) % 7;

  function entryFor(displayIndex: number): WeeklyPlanEntry | undefined {
    return weeklyPlan.find((e) => e.day === toJsDay(displayIndex));
  }

  const editingEntry = editDay === null ? undefined : entryFor(editDay);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Week</h1>
          <p className="text-sm text-muted-foreground">
            A repeating weekly schedule. Today&apos;s plan drives your home
            screen.
          </p>
        </div>
      </div>

      {(templates.data ?? []).length === 0 && weeklyPlan.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No plan yet"
          description="Create a workout template first, then assign it to a day."
        />
      ) : (
        <ul className="space-y-2">
          {DAY_NAMES.map((day, i) => {
            const entry = entryFor(i);
            const isToday = i === todayIndex;
            return (
              <li
                key={day}
                className={
                  "flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm " +
                  (isToday ? "border-primary/40" : "border-border")
                }
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold">
                    <span>{day}</span>
                    {isToday && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                        Today
                      </span>
                    )}
                  </p>
                  {entry ? (
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      {entry.type === "workout" ? (
                        <Dumbbell size={14} aria-hidden="true" />
                      ) : (
                        <HeartPulse size={14} aria-hidden="true" />
                      )}
                      <span className="truncate font-medium text-foreground">
                        {entry.name}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Nothing scheduled
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {entry && (
                    <button
                      onClick={() => removePlanEntry(toJsDay(i))}
                      aria-label={`Clear ${day}`}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  )}
                  <Button
                    variant={entry ? "secondary" : "primary"}
                    size="sm"
                    onClick={() => setEditDay(i)}
                  >
                    {entry ? "Change" : <><Plus size={14} aria-hidden="true" /> Assign</>}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editDay !== null && (
        <AssignDialog
          dayLabel={DAY_NAMES[editDay]}
          current={editingEntry}
          templates={templates.data ?? []}
          onPick={(type, refId, name) => {
            setPlanEntry(toJsDay(editDay), { type, refId, name });
            setEditDay(null);
          }}
          onClear={() => {
            removePlanEntry(toJsDay(editDay));
            setEditDay(null);
          }}
          onClose={() => setEditDay(null)}
        />
      )}
    </div>
  );
}

function AssignDialog({
  dayLabel,
  current,
  templates,
  onPick,
  onClear,
  onClose,
}: {
  dayLabel: string;
  current: WeeklyPlanEntry | undefined;
  templates: { id: string; name: string; exercises: unknown[] }[];
  onPick: (type: PlanItemType, refId: string | null, name: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<PlanItemType>(
    current?.type ?? "workout",
  );
  const typeRef = useRef<HTMLDivElement>(null);
  useRadiogroupArrows(typeRef);

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Schedule ${dayLabel}`}
      footer={
        <div className="flex gap-2">
          {current && (
            <Button variant="secondary" onClick={onClear}>
              Clear
            </Button>
          )}
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
        </div>
      }
    >
      <div
        ref={typeRef}
        role="radiogroup"
        aria-label="Plan type"
        className="mb-3 grid grid-cols-2 gap-2"
      >
        <button
          role="radio"
          aria-checked={type === "workout"}
          onClick={() => setType("workout")}
          className={
            "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring " +
            (type === "workout"
              ? "border-primary bg-primary/15 text-primary"
              : "border-border text-muted-foreground hover:bg-muted")
          }
        >
          <Dumbbell size={15} aria-hidden="true" /> Workout
        </button>
        <button
          role="radio"
          aria-checked={type === "cardio"}
          onClick={() => setType("cardio")}
          className={
            "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring " +
            (type === "cardio"
              ? "border-primary bg-primary/15 text-primary"
              : "border-border text-muted-foreground hover:bg-muted")
          }
        >
          <HeartPulse size={15} aria-hidden="true" /> Cardio
        </button>
      </div>

      {type === "workout" ? (
        templates.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No workout templates yet — create one first.
          </p>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {templates.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => onPick("workout", t.id, t.name)}
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="truncate font-medium">{t.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {t.exercises.length} exercises
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {CARDIO_ACTIVITIES.map((a) => (
            <li key={a.value}>
              <button
                onClick={() => onPick("cardio", null, a.label)}
                className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="flex items-center justify-center gap-1.5">
                  <HeartPulse size={14} aria-hidden="true" /> {a.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}