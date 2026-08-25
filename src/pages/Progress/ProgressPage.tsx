import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Flame, Timer, TrendingUp } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getFinishedSessions } from "../../db/sessions";
import { getAllRecords } from "../../db/records";
import { getAllExercises } from "../../db/exercises";
import { useSettings } from "../../stores/settings";
import {
  computeWeeklySummary,
  exerciseProgression,
  workoutsPerWeek,
} from "../../services/statsService";
import { formatDateShort, formatDuration, relativeDate } from "../../utils/format";
import { formatWeight, kgToDisplay } from "../../utils/units";
import { EmptyState } from "../../components/ui/EmptyState";

const RANGES = [
  { value: 8, label: "8W" },
  { value: 13, label: "3M" },
  { value: 26, label: "6M" },
] as const;

export default function ProgressPage() {
  const unit = useSettings((s) => s.unit);
  const sessions = useAsync(getFinishedSessions, []);
  const records = useAsync(getAllRecords, []);
  const exercises = useAsync(getAllExercises, []);

  const [rangeWeeks, setRangeWeeks] = useState<number>(13);
  const [exerciseId, setExerciseId] = useState<string>("");

  const weekly = useMemo(
    () => computeWeeklySummary(sessions.data ?? []),
    [sessions.data],
  );

  const perWeekData = useMemo(() => {
    const weeks = workoutsPerWeek(sessions.data ?? [], rangeWeeks);
    return weeks.map((w) => ({
      label: formatDateShort(w.weekStart),
      workouts: w.count,
    }));
  }, [sessions.data, rangeWeeks]);

  const selectedExerciseId =
    exerciseId || exercises.data?.find((e) => e.name === "Bench Press")?.id || "";

  const progression = useMemo(() => {
    if (!selectedExerciseId) return [];
    return exerciseProgression(sessions.data ?? [], selectedExerciseId);
  }, [sessions.data, selectedExerciseId]);

  const recentPRs = useMemo(
    () => [...(records.data ?? [])].sort((a, b) => b.date - a.date).slice(0, 10),
    [records.data],
  );

  if (sessions.loading) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        <div
          role="radiogroup"
          aria-label="Time range"
          className="flex gap-1 rounded-xl bg-muted p-1"
        >
          {RANGES.map((r) => (
            <button
              key={r.value}
              role="radio"
              aria-checked={rangeWeeks === r.value}
              onClick={() => setRangeWeeks(r.value)}
              className={
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring " +
                (rangeWeeks === r.value
                  ? "bg-card shadow-sm"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Training summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Activity} label="This week" value={`${weekly.workouts} workouts`} />
        <StatCard
          icon={Timer}
          label="Avg duration"
          value={formatDuration(avgDuration(sessions.data ?? []))}
        />
        <StatCard icon={Flame} label="Streak" value={`${weekly.streakDays} days`} />
        <StatCard
          icon={TrendingUp}
          label="Total sessions"
          value={String((sessions.data ?? []).length)}
        />
      </div>

      {/* Workouts per week */}
      <section
        className="rounded-2xl border border-border bg-card p-4 shadow-sm"
        aria-label="Workouts per week"
      >
        <h2 className="mb-3 text-sm font-semibold">Workouts per week</h2>
        <ChartFrame>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perWeekData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="workouts" fill="var(--color-primary)" radius={[6, 6, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </section>

      {/* Strength progression */}
      <section
        className="rounded-2xl border border-border bg-card p-4 shadow-sm"
        aria-label="Strength progression"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Strength</h2>
          <select
            value={selectedExerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
            aria-label="Choose exercise"
            className="max-w-[55%] rounded-lg border border-input bg-background px-2 py-1.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-ring"
          >
            {(exercises.data ?? []).map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        {progression.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No recorded sets for this exercise yet.
          </p>
        ) : (
          <div className="space-y-5">
            <MiniChart
              title={`Top weight (${unit})`}
              data={progression.map((p) => ({
                label: formatDateShort(p.date),
                value: Math.round(kgToDisplay(p.topWeight, unit) * 10) / 10,
              }))}
            />
            <MiniChart
              title="Top reps"
              data={progression.map((p) => ({
                label: formatDateShort(p.date),
                value: p.bestReps,
              }))}
            />
            <MiniChart
              title="Estimated 1RM"
              data={progression.map((p) => ({
                label: formatDateShort(p.date),
                value: Math.round(p.best1RM * 10) / 10,
              }))}
            />
            <MiniChart
              title={`Volume (${unit})`}
              data={progression.map((p) => ({
                label: formatDateShort(p.date),
                value: Math.round(kgToDisplay(p.volume, unit)),
              }))}
            />
          </div>
        )}
      </section>

      {/* Personal records */}
      <section aria-label="Personal records">
        <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Personal Records
        </h2>
        {recentPRs.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No records yet"
            description="PRs are detected automatically as you train."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {recentPRs.map((pr) => (
              <li
                key={pr.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3.5 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    🏆 {pr.exerciseName}
                  </p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {pr.type.replace("-", " ")} · {relativeDate(pr.date)}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                  {formatWeight(pr.weight, unit)} × {pr.reps}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function avgDuration(sessions: { startedAt: number; endedAt: number | null }[]): number {
  if (sessions.length === 0) return 0;
  const total = sessions.reduce(
    (sum, s) => sum + ((s.endedAt ?? s.startedAt) - s.startedAt),
    0,
  );
  return total / sessions.length;
}

function ChartFrame({ children }: { children: React.ReactNode }) {
  return <div className="h-52 w-full sm:h-64">{children}</div>;
}

function MiniChart({
  title,
  data,
}: {
  title: string;
  data: { label: string; value: number }[];
}) {
  return (
    <div>
      <h3 className="mb-1 px-1 text-xs font-medium text-muted-foreground">{title}</h3>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "var(--color-primary)" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon size={14} aria-hidden="true" /> {label}
      </p>
      <p className="mt-1 truncate text-lg font-bold leading-tight">{value}</p>
    </div>
  );
}
