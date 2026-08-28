import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  Flame,
  HeartPulse,
  History,
  Play,
  Plus,
  Timer,
  Trophy,
} from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getAllTemplates } from "../../db/templates";
import { getFinishedSessions } from "../../db/sessions";
import { getAllCardio } from "../../db/cardio";
import { getBestRecords } from "../../db/records";
import { useSettings } from "../../stores/settings";
import { useActiveWorkout } from "../../stores/activeWorkout";
import { cardioThisWeek, computeWeeklySummary } from "../../services/statsService";
import { estimatedDurationMinutes, formatDuration, relativeDate } from "../../utils/format";
import { formatWeight } from "../../utils/units";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { CardioLogDialog } from "../../components/cardio/CardioLogDialog";
import { InstallBanner } from "../../components/PwaPrompts";
import type { CardioActivity, WorkoutTemplate } from "../../types";

export default function HomePage() {
  const onboarded = useSettings((s) => s.onboarded);
  if (!onboarded) return <Navigate to="/onboarding" replace />;

  return <HomeContent />;
}

function HomeContent() {
  const navigate = useNavigate();
  const unit = useSettings((s) => s.unit);
  const weeklyPlan = useSettings((s) => s.weeklyPlan);
  const startFromTemplate = useActiveWorkout((s) => s.startFromTemplate);
  const startEmpty = useActiveWorkout((s) => s.startEmpty);
  const hasActive = !!useActiveWorkout((s) => s.sessionId);
  const [showCardio, setShowCardio] = useState(false);

  const templates = useAsync(getAllTemplates, []);
  const sessions = useAsync(getFinishedSessions, []);
  const records = useAsync(() => getBestRecords().then((r) => r.sort((a, b) => b.date - a.date)), []);
  const cardio = useAsync(getAllCardio, []);

  const planToday = useMemo(
    () => weeklyPlan.find((e) => e.day === new Date().getDay()),
    [weeklyPlan],
  );
  const plannedWorkout = useMemo(
    () =>
      planToday?.type === "workout"
        ? (templates.data ?? []).find((t) => t.id === planToday.refId) ?? null
        : null,
    [planToday, templates.data],
  );

  const suggested = useMemo<WorkoutTemplate | null>(() => {
    if (plannedWorkout) return plannedWorkout;
    const list = templates.data ?? [];
    if (list.length === 0) return null;
    return (
      [...list].sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return (b.lastPerformedAt ?? 0) - (a.lastPerformedAt ?? 0);
      })[0] ?? null
    );
  }, [plannedWorkout, templates.data]);

  const weekly = useMemo(
    () => computeWeeklySummary(sessions.data ?? []),
    [sessions.data],
  );
  const cardioWeek = useMemo(
    () => cardioThisWeek(cardio.data ?? []),
    [cardio.data],
  );

  function handleStartSuggested() {
    if (!suggested || hasActive) return;
    startFromTemplate(suggested);
    navigate("/active");
  }

  const totalSets =
    suggested?.exercises.reduce((n, e) => n + e.sets.length, 0) ?? 0;

  return (
    <div className="space-y-5">
      <InstallBanner />

      {/* Today's workout */}
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-b from-primary/[0.07] to-card">
        <CardContent className="pt-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Today&apos;s Workout
          </p>
          {planToday?.type === "cardio" ? (
            <>
              <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
                <HeartPulse size={22} aria-hidden="true" /> {planToday.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Scheduled cardio · tap to log today&apos;s session
              </p>
              <Button
                size="lg"
                className="mt-4 w-full"
                onClick={() => setShowCardio(true)}
              >
                <HeartPulse size={18} aria-hidden="true" /> Log {planToday.name}
              </Button>
            </>
          ) : suggested ? (
            <>
              <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
                <span className="truncate">{suggested.name}</span>
                {plannedWorkout && (
                  <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                    Scheduled
                  </span>
                )}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {suggested.exercises.length} exercises · ~
                {estimatedDurationMinutes(suggested.exercises.length, totalSets)} min
                {" · "}Last performed{" "}
                {relativeDate(suggested.lastPerformedAt)}
              </p>
              <Button
                size="lg"
                className="mt-4 w-full"
                onClick={handleStartSuggested}
              >
                <Play size={18} aria-hidden="true" /> Start Workout
              </Button>
            </>
          ) : (
            <>
              <h2 className="mt-1 text-xl font-bold">No workout yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first workout template or start training right away.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={() => {
                    startEmpty();
                    navigate("/active");
                  }}
                >
                  <Play size={18} aria-hidden="true" /> Start Empty Workout
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => navigate("/workouts/new")}
                >
                  <Plus size={18} aria-hidden="true" /> Create Workout
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {hasActive && (
        <Link to="/active">
          <Card className="border-primary/40 p-4 text-sm font-semibold text-primary transition-colors hover:bg-muted">
            You have a workout in progress — tap to resume →
          </Card>
        </Link>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <QuickAction
          icon={Play}
          label="Empty Workout"
          onClick={() => {
            startEmpty();
            navigate("/active");
          }}
        />
        <QuickAction
          icon={Plus}
          label="Create Workout"
          onClick={() => navigate("/workouts/new")}
        />
        <QuickAction
          icon={Dumbbell}
          label="Exercises"
          onClick={() => navigate("/exercises")}
        />
      </div>

      {/* Weekly summary */}
      <section aria-labelledby="weekly-heading">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 id="weekly-heading" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            This Week
          </h2>
          <Link
            to="/planner"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <CalendarDays size={14} aria-hidden="true" /> Plan week
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile icon={ClipboardList} label="Workouts" value={String(weekly.workouts)} />
          <StatTile
            icon={BarChart3}
            label="Volume"
            value={formatWeight(weekly.totalVolume, unit)}
          />
          <StatTile
            icon={Timer}
            label="Time"
            value={formatDuration(weekly.totalDurationMs)}
          />
          <StatTile icon={Flame} label="Streak" value={`${weekly.streakDays} day${weekly.streakDays === 1 ? "" : "s"}`} />
          <StatTile
            icon={HeartPulse}
            label="Cardio"
            value={`${cardioWeek.sessions}× ${cardioWeek.minutes} min`}
          />
        </div>
      </section>

      {/* Recent PRs */}
      <section aria-labelledby="pr-heading">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 id="pr-heading" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Records
          </h2>
          <Link
            to="/progress"
            className="text-sm font-medium text-primary hover:underline"
          >
            View progress
          </Link>
        </div>
        {(records.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No personal records yet"
            description="Complete your first workout and PRs will show up here automatically."
          />
        ) : (
          <div className="space-y-2">
            {records.data!.slice(0, 5).map((r) => (
              <Card key={r.id} className="flex items-center gap-3 p-4">
                <span className="text-xl" aria-hidden="true">🏆</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.exerciseName}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {r.type.replace("-", " ")} · {relativeDate(r.date)}
                  </p>
                </div>
                <p className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                  {r.reps > 0 && r.weight > 0
                    ? `${formatWeight(r.weight, unit)} × ${r.reps}`
                    : formatWeight(r.weight, unit)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Link to="/history" className="block md:hidden">
        <Button variant="secondary" className="w-full">
          <History size={16} aria-hidden="true" /> View Full History
        </Button>
      </Link>

      <CardioLogDialog
        open={showCardio}
        onClose={() => setShowCardio(false)}
        initialActivity={
          planToday?.type === "cardio"
            ? (planToday.name as CardioActivity)
            : "Run"
        }
      />
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Play;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="text-xs font-semibold leading-tight">{label}</span>
    </button>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Play;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:flex">
        <Icon size={17} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-bold leading-tight">{value}</p>
      </div>
    </Card>
  );
}
