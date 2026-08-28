import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Copy,
  Dumbbell,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { deleteTemplate, getAllTemplates, saveTemplate } from "../../db/templates";
import { useActiveWorkout } from "../../stores/activeWorkout";
import { useToast } from "../../components/ui/Toast";
import { estimatedDurationMinutes, relativeDate } from "../../utils/format";
import { uid } from "../../db/db";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { EmptyState } from "../../components/ui/EmptyState";
import type { WorkoutTemplate } from "../../types";

export default function WorkoutsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const startFromTemplate = useActiveWorkout((s) => s.startFromTemplate);
  const hasActive = !!useActiveWorkout((s) => s.sessionId);
  const templates = useAsync(getAllTemplates, []);
  const [deleteTarget, setDeleteTarget] = useState<WorkoutTemplate | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  async function handleStart(t: WorkoutTemplate) {
    if (hasActive) {
      navigate("/active");
      return;
    }
    startFromTemplate(t);
    navigate("/active");
  }

  async function handleDuplicate(t: WorkoutTemplate) {
    const copy: WorkoutTemplate = {
      ...t,
      id: uid(),
      name: `${t.name} (Copy)`,
      favorite: false,
      createdAt: Date.now(),
      lastPerformedAt: null,
      exercises: t.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })),
    };
    await saveTemplate(copy);
    toast("success", "Workout duplicated");
    templates.reload();
  }

  async function handleToggleFavorite(t: WorkoutTemplate) {
    await saveTemplate({ ...t, favorite: !t.favorite });
    templates.reload();
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    await deleteTemplate(deleteTarget.id);
    setDeleteTarget(null);
    toast("info", "Workout deleted");
    templates.reload();
  }

  const list = templates.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workouts</h1>
          <p className="text-sm text-muted-foreground">
            Your reusable workout templates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate("/planner")}>
            <CalendarDays size={18} aria-hidden="true" />
            <span className="hidden sm:inline">My Week</span>
          </Button>
          <Button onClick={() => navigate("/workouts/new")}>
            <Plus size={18} aria-hidden="true" />
            <span className="hidden sm:inline">New</span>
          </Button>
        </div>
      </div>

      {templates.loading ? null : list.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No workouts yet"
          description="Create your first template — e.g. Push Day or Full Body — and reuse it every session."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => {
            const totalSets = t.exercises.reduce((n, e) => n + e.sets.length, 0);
            return (
              <li key={t.id}>
                <div className="relative flex h-full flex-col rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      onClick={() => navigate(`/workouts/${t.id}/edit`)}
                      aria-label={`Edit ${t.name}`}
                    >
                      <p className="truncate font-semibold">{t.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {t.exercises.length} exercises · ~
                        {estimatedDurationMinutes(t.exercises.length, totalSets)} min
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Last performed {relativeDate(t.lastPerformedAt)}
                      </p>
                    </button>
                    <button
                      onClick={() => handleToggleFavorite(t)}
                      aria-label={t.favorite ? "Unfavorite workout" : "Favorite workout"}
                      aria-pressed={t.favorite}
                      className="rounded-lg p-1.5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <Star
                        size={18}
                        className={t.favorite ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground"}
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  <div className="mt-auto flex items-center gap-2 pt-4">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleStart(t)}
                      disabled={t.exercises.length === 0 || hasActive}
                    >
                      <Play size={15} aria-hidden="true" /> Start
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      aria-label={`Edit ${t.name}`}
                      onClick={() => navigate(`/workouts/${t.id}/edit`)}
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`More actions for ${t.name}`}
                      onClick={() => setMenuFor(menuFor === t.id ? null : t.id)}
                    >
                      <MoreVertical size={16} aria-hidden="true" />
                    </Button>
                  </div>

                  {menuFor === t.id && (
                    <div
                      className="absolute right-12 top-14 z-20 w-40 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
                      role="menu"
                    >
                      <MenuItem
                        icon={Copy}
                        label="Duplicate"
                        onClick={() => {
                          setMenuFor(null);
                          void handleDuplicate(t);
                        }}
                      />
                      <MenuItem
                        icon={Trash2}
                        label="Delete"
                        danger
                        onClick={() => {
                          setMenuFor(null);
                          setDeleteTarget(t);
                        }}
                      />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete workout?"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">{deleteTarget?.name}</strong> will be
          removed permanently. Past sessions in history are kept.
        </p>
      </Dialog>

      {/* click-away for context menu */}
      {menuFor && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setMenuFor(null)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: typeof Play;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={
        "flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium hover:bg-muted " +
        (danger ? "text-destructive" : "")
      }
    >
      <Icon size={16} aria-hidden="true" /> {label}
    </button>
  );
}
