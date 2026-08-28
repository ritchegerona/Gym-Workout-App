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
  muscleVolumePerWeek,
  workoutsPerWeek,
} from "../../services/statsService";
import { formatDateShort, formatDuration, relativeDate } from "../../utils/format";
import { formatWeight, kgToDisplay } from "../../utils/units";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { classifyStrength, formatEstimated1RM, strengthLevelIndex, STRENGTH_STANDARDS } from "../../utils/strengthStandard";
import type { Exercise } from "../../types";

const RANGES = [
  { value: 8, label: "8W" },
  { value: 13, label: "3M" },
  { value: 26, label: "6M" },
] as const;

const MUSCLE_COLORS = [
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#eab308",
  "#ec4899",
];

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

  const exerciseById = useMemo(() => {
    const m = new Map<string, { muscleGroup: string }>();
    for (const e of exercises.data ?? []) m.set(e.id, e);
    return m as Map<string, Exercise>;
  }, [exercises.data]);

  const muscleVolumeData = useMemo(() => {
    const rows = muscleVolumePerWeek(sessions.data ?? [], exerciseById, rangeWeeks);
    return rows.map((r) => {
      const { weekStart, ...groups } = r;
      return { label: formatDateShort(weekStart), ...groups };
    });
  }, [sessions.data, exerciseById, rangeWeeks]);

  const muscleGroups = useMemo(
    () =>
      muscleVolumeData.length > 0
        ? Object.keys(muscleVolumeData[0]).filter((k) => k !== "label")
        : [],
    [muscleVolumeData],
  );

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

      {/* Muscle-group volume per week */}
      <section
        className="rounded-2xl border border-border bg-card p-4 shadow-sm"
        aria-label="Muscle volume per week"
      >
        <h2 className="mb-1 text-sm font-semibold">Muscle volume</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Set volume per week, split by primary muscle group.
        </p>
        {muscleVolumeData.length === 0 || muscleGroups.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No sessions yet — finish a workout to see volume by muscle group.
          </p>
        ) : (
          <>
            <ChartFrame>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={muscleVolumeData} margin={{ top: 4, right: 4, left: -14, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)" }}
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  {muscleGroups.map((g, i) => (
                    <Bar
                      key={g}
                      dataKey={g}
                      name={g}
                      stackId="vol"
                      fill={MUSCLE_COLORS[i % MUSCLE_COLORS.length]}
                      maxBarSize={40}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {muscleGroups.map((g, i) => (
                <li key={g} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: MUSCLE_COLORS[i % MUSCLE_COLORS.length] }}
                  />
                  {g}
                </li>
              ))}
            </ul>
          </>
        )}
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

      {/* 1RM calculator + strength standards */}
      <OneRmCalculator
        exerciseName={
          exercises.data?.find((e) => e.id === selectedExerciseId)?.name ?? ""
        }
        unit={unit}
      />

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

function OneRmCalculator({
  exerciseName,
  unit,
}: {
  exerciseName: string;
  unit: "kg" | "lb";
}) {
  const settings = useSettings();
  const profile = settings.profile;
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("10");
  const [bwInput, setBwInput] = useState(
    profile.bodyWeightKg ? String(Math.round(profile.bodyWeightKg * 10) / 10) : "",
  );

  const toKg = (n: number) => (unit === "kg" ? n : n / 2.20462);
  const toDisplay = (kg: number) => (unit === "kg" ? kg : kg * 2.20462);

  const w = parseFloat(weight);
  const r = parseInt(reps, 10);
  const valid = w > 0 && r > 0;
  const oneRmKg = valid ? formatEstimated1RM(toKg(w), r) : 0;
  const bodyWeightKg = parseFloat(bwInput);
  const standard = classifyStrength(exerciseName, oneRmKg, bodyWeightKg);
  const standards = STRENGTH_STANDARDS[exerciseName] ?? null;
  const bwForLadder = bodyWeightKg > 0 ? bodyWeightKg : profile.bodyWeightKg ?? null;

  return (
    <section
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
      aria-label="One rep max calculator"
    >
      <h2 className="mb-1 text-sm font-semibold">Estimated 1RM</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Epley formula for {exerciseName || "the selected exercise"}.
      </p>

      <div className="grid grid-cols-[1fr_88px_auto] gap-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            Weight ({unit})
          </span>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={unit === "kg" ? "80" : "175"}
            aria-label={`Weight in ${unit}`}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Reps</span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            aria-label="Reps"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            Body wt ({unit})
          </span>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            value={bwInput}
            onChange={(e) => setBwInput(e.target.value)}
            placeholder={unit === "kg" ? "80" : "175"}
            aria-label="Body weight"
          />
        </label>
      </div>

      {valid && (
        <div className="mt-3 rounded-xl bg-muted/60 px-3 py-2.5">
          <p className="text-sm text-muted-foreground">Estimated 1RM</p>
          <p className="font-mono text-2xl font-bold tabular-nums">
            {Math.round(toDisplay(oneRmKg) * 10) / 10} {unit}
          </p>
          {standard && (
            <p className="mt-1 text-sm font-medium text-primary">
              {standard.level.level} — {Math.round(toDisplay(oneRmKg / bodyWeightKg) * 100) / 100}x body weight
              {standard.next && (
                <span className="ml-1 font-normal text-muted-foreground">
                  · {Math.round(toDisplay(standard.kgToNext) * 10) / 10} {unit} to {standard.next.level}
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {standards && bwForLadder && oneRmKg > 0 && (
        <ol className="mt-3 space-y-1">
          {standards.map((lvl) => {
            const needed = lvl.bodyweightRatio * bwForLadder;
            const reached = oneRmKg >= needed;
            const idx = strengthLevelIndex(lvl.level);
            const achIdx = standard ? strengthLevelIndex(standard.level.level) : -1;
            const isCurrent = idx === achIdx;
            return (
              <li
                key={lvl.level}
                className="flex items-center justify-between text-sm"
              >
                <span
                  className={
                    isCurrent ? "font-semibold text-primary" : "text-muted-foreground"
                  }
                >
                  {lvl.level}
                  {reached ? " ✓" : ""}
                </span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  ≥ {Math.round(toDisplay(needed) * 10) / 10} {unit}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
