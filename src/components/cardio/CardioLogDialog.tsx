import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useToast } from "../ui/Toast";
import { saveCardioEntry } from "../../db/cardio";
import { uid } from "../../db/db";
import { CARDIO_ACTIVITIES, DISTANCE_ACTIVITIES } from "../../data/cardio";
import type { CardioActivity } from "../../types";

interface CardioLogDialogProps {
  open: boolean;
  onClose: () => void;
  initialActivity?: CardioActivity;
}

export function CardioLogDialog({
  open,
  onClose,
  initialActivity = "Run",
}: CardioLogDialogProps) {
  const toast = useToast();
  const [activity, setActivity] = useState<CardioActivity>(initialActivity);
  const [durationMin, setDurationMin] = useState("30");
  const [distanceKm, setDistanceKm] = useState("");
  const [calories, setCalories] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setActivity(initialActivity);
      setDurationMin("30");
      setDistanceKm("");
      setCalories("");
      setNotes("");
    }
  }, [open, initialActivity]);

  const distance = parseFloat(distanceKm);
  const cal = parseInt(calories, 10);
  const duration = parseInt(durationMin, 10);
  const valid = duration > 0;
  const wantsDistance = DISTANCE_ACTIVITIES.includes(activity);

  async function handleSave() {
    if (!valid) return;
    await saveCardioEntry({
      id: uid(),
      activity,
      durationMin: duration,
      distanceKm: wantsDistance && distance > 0 ? distance : null,
      calories: cal > 0 ? cal : null,
      notes: notes.trim() || undefined,
      date: Date.now(),
    });
    toast("success", `${duration} min ${activity} logged`);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Log cardio"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={!valid}>
            <Activity size={16} aria-hidden="true" /> Log Entry
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            Activity
          </span>
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value as CardioActivity)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          >
            {CARDIO_ACTIVITIES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            Duration (min)
          </span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            aria-label="Duration in minutes"
          />
        </label>

        {wantsDistance && (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">
              Distance (km)
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
              placeholder="5.0"
              aria-label="Distance in kilometers"
            />
          </label>
        )}

        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            Calories (optional)
          </span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="300"
            aria-label="Calories"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            Notes (optional)
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Felt great, negative splits"
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          />
        </label>
      </div>
    </Dialog>
  );
}