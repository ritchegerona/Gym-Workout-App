import { useMemo } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  BarChart3,
  ClipboardList,
  Eye,
  Share2,
  Timer,
  Trophy,
} from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getSession } from "../../db/sessions";
import { getAllRecords } from "../../db/records";
import { useSettings } from "../../stores/settings";
import {
  countCompletedSets,
  totalSessionVolume,
} from "../../utils/calculations";
import { formatDate, formatDuration } from "../../utils/format";
import { formatWeight } from "../../utils/units";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { useToast } from "../../components/ui/Toast";
import type { PersonalRecord } from "../../types";

export default function CompleteSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const unit = useSettings((s) => s.unit);
  const toast = useToast();

  const session = useAsync(
    () => (id ? getSession(id) : Promise.resolve(undefined)),
    [id],
  );
  const records = useAsync(getAllRecords, []);

  const prs = useMemo<PersonalRecord[]>(
    () =>
      (records.data ?? [])
        .filter((r) => r.sessionId === id)
        .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName)),
    [records.data, id],
  );

  if (session.loading) return null;

  const s = session.data;
  if (!s) {
    return (
      <div className="mx-auto max-w-md pt-8">
        <EmptyState
          icon={ClipboardList}
          title="Workout not found"
          description="This workout may have been removed."
        />
        <Button size="lg" className="mt-4 w-full" onClick={() => navigate("/")}>
          Back to Home
        </Button>
      </div>
    );
  }

  const durationMs = (s.endedAt ?? s.startedAt) - s.startedAt;
  const setsDone = countCompletedSets(s.exercises);
  const volume = totalSessionVolume(s.exercises);
  const justFinished =
    (location.state as { justFinished?: boolean } | null)?.justFinished === true;

  async function handleShare() {
    const lines = [
      `💪 ${s!.templateName ?? "Workout"} — ${formatDuration(durationMs)}`,
      `${setsDone} sets · ${formatWeight(volume, unit)} total volume`,
      ...(prs.length > 0 ? [`🏆 ${prs.length} new PR${prs.length > 1 ? "s" : ""}!`] : []),
    ];
    const text = lines.join("\n");
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Workout", text });
        return;
      } catch {
        // user cancelled or unsupported — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast("success", "Summary copied to clipboard");
    } catch {
      toast("info", text);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5 pt-4 text-center md:pt-10">
      <div aria-hidden="true" className="text-6xl">🎉</div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Workout Complete
        </h1>
        <p className="mt-1 text-sm capitalize text-muted-foreground">
          {s.templateName ?? "Session"} · {formatDate(s.startedAt)}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-left">
        <Metric icon={Timer} label="Duration" value={formatDuration(durationMs)} />
        <Metric icon={ClipboardList} label="Sets" value={String(setsDone)} />
        <Metric
          icon={BarChart3}
          label="Volume"
          value={formatWeight(volume, unit)}
        />
        <Metric icon={Eye} label="Exercises" value={String(s.exercises.length)} />
      </dl>

      {prs.length > 0 && (
        <section
          className="rounded-2xl border border-primary/40 bg-primary/[0.07] p-4 text-left"
          aria-label="New personal records"
        >
          <h2 className="mb-2 font-bold">
            🏆 {prs.length} New PR{prs.length > 1 ? "s" : ""}
          </h2>
          <ul className="space-y-1.5">
            {prs.map((pr) => (
              <li key={pr.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{pr.exerciseName}</span>
                <span className="shrink-0 font-mono font-semibold tabular-nums">
                  {formatWeight(pr.weight, unit)}
                  {pr.reps > 0 ? ` × ${pr.reps}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-2 pb-safe">
        {justFinished ? (
          <Button size="lg" className="w-full" onClick={() => navigate("/")}>
            Done
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={() => navigate("/history")}>
            View History
          </Button>
        )}
        <div className="flex gap-2">
          <Link to={`/history/${s.id}`} className="flex-1">
            <Button variant="secondary" className="w-full">
              <Eye size={16} aria-hidden="true" /> View Workout
            </Button>
          </Link>
          <Button variant="secondary" className="flex-1" onClick={handleShare}>
            <Share2 size={16} aria-hidden="true" /> Share
          </Button>
        </div>
      </div>

      {(prs.length > 0 || volume > 0) && (
        <p className="pb-8 text-xs text-muted-foreground">
          <Trophy size={12} className="mr-1 inline" aria-hidden="true" />
          Great work — see you next session.
        </p>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Timer;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon size={14} aria-hidden="true" /> {label}
      </dt>
      <dd className="mt-0.5 text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}
