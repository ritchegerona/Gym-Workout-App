import { useRef, useState } from "react";
import {
  Bell,
  Download,
  Moon,
  Ruler,
  Target,
  Trash2,
  Upload,
  Vibrate,
  Volume2,
} from "lucide-react";
import {
  REST_PRESETS,
  TRAINING_GOALS,
  useSettings,
} from "../../stores/settings";
import { useActiveWorkout } from "../../stores/activeWorkout";
import { clearAllData } from "../../db/records";
import {
  applyImport,
  buildExportPayload,
  downloadExport,
  parseImportPayload,
  type ExportPayload,
  type ImportMode,
} from "../../services/dataPortability";
import { ToggleGroup, Switch } from "../../components/ui/Switch";
import { Input, Select } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/Toast";
import { InstallAppRow } from "../../components/PwaPrompts";
import type { ThemeMode, UnitSystem } from "../../types";

export default function ProfilePage() {
  const toast = useToast();
  const settings = useSettings();
  const activeSession = !!useActiveWorkout((s) => s.sessionId);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingImport, setPendingImport] = useState<ExportPayload | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    try {
      downloadExport(await buildExportPayload(settings.profile));
      toast("success", "Backup downloaded");
    } catch {
      toast("error", "Export failed. Please try again.");
    }
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const result = parseImportPayload(text);
      if (!result.ok) {
        toast("error", result.error);
        return;
      }
      setImportMode("merge");
      setPendingImport(result.payload);
    } catch {
      toast("error", "Could not read that file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleConfirmImport() {
    if (!pendingImport) return;
    const payload = pendingImport;
    setPendingImport(null);
    try {
      if (importMode === "replace" && activeSession) {
        useActiveWorkout.getState().discardWorkout();
      }
      const counts = await applyImport(payload, importMode);
      toast(
        "success",
        `Imported ${counts.sessions} workouts, ${counts.templates} templates${
          counts.exercises > 0 ? `, ${counts.exercises} exercises` : ""
        }. Reloading…`,
      );
      window.setTimeout(() => window.location.reload(), 900);
    } catch {
      toast("error", "Import failed. Please try again.");
    }
  }

  async function handleClear() {
    setConfirmClear(false);
    if (activeSession) useActiveWorkout.getState().discardWorkout();
    try {
      await clearAllData();
      localStorage.removeItem("irontrack-settings");
      localStorage.removeItem("irontrack-active-workout");
      toast("info", "All data cleared");
      window.location.assign("/");
    } catch {
      toast("error", "Could not clear data. Please try again.");
    }
  }

  async function handleNotificationToggle() {
    if (settings.notificationsEnabled) {
      settings.toggleNotifications();
      return;
    }
    if (!("Notification" in window)) {
      toast("warning", "Notifications are not supported in this browser");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        settings.toggleNotifications();
        toast("success", "Notifications enabled");
      } else {
        toast("warning", "Notification permission was denied");
      }
    } catch {
      toast("error", "Could not request notification permission");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>

      {/* Profile */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm" aria-label="Profile information">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Name</span>
          <Input
            value={settings.profile.name}
            onChange={(e) => settings.updateProfile({ name: e.target.value })}
            placeholder="Your name"
            maxLength={40}
          />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <NumProfileField
            label="Age"
            value={settings.profile.age}
            onChange={(v) => settings.updateProfile({ age: v })}
            min={10}
            max={100}
            suffix="yrs"
          />
          <NumProfileField
            label="Height"
            value={settings.profile.heightCm}
            onChange={(v) => settings.updateProfile({ heightCm: v })}
            min={100}
            max={250}
            suffix="cm"
          />
          <NumProfileField
            label="Body weight"
            value={
              settings.profile.bodyWeightKg === null
                ? null
                : Math.round(
                    settings.unit === "kg"
                      ? settings.profile.bodyWeightKg
                      : settings.profile.bodyWeightKg * 2.20462,
                  )
            }
            onChange={(v) =>
              settings.updateProfile({
                bodyWeightKg:
                  v === null ? null : settings.unit === "kg" ? v : v / 2.20462,
              })
            }
            min={25}
            max={500}
            suffix={settings.unit}
          />
        </div>
        <label className="block space-y-1">
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Target size={12} aria-hidden="true" /> Training goal
          </span>
          <Select
            value={settings.profile.goal ?? ""}
            onChange={(e) =>
              settings.updateProfile({
                goal: (e.target.value || null) as never,
              })
            }
          >
            <option value="">Not set</option>
            {TRAINING_GOALS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </Select>
        </label>
      </section>

      {/* App */}
      <SettingsSection title="App">
        <InstallAppRow />
      </SettingsSection>

      {/* Units & appearance */}
      <SettingsSection title="Units & Appearance">
        <SettingRow icon={Ruler} label="Weight units">
          <ToggleGroup<UnitSystem>
            options={[
              { value: "kg", label: "kg" },
              { value: "lb", label: "lb" },
            ]}
            value={settings.unit}
            onChange={settings.setUnit}
            size="sm"
            label="Weight units"
          />
        </SettingRow>
        <SettingRow icon={Moon} label="Theme">
          <ToggleGroup<ThemeMode>
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "system", label: "Auto" },
            ]}
            value={settings.theme}
            onChange={settings.setTheme}
            size="sm"
            label="Theme"
          />
        </SettingRow>
      </SettingsSection>

      {/* Workout defaults */}
      <SettingsSection title="Workout Defaults">
        <SettingRow label="Default rest time">
          <ToggleGroup<number>
            options={REST_PRESETS.map((r) => ({ value: r, label: `${r}s` }))}
            value={settings.defaultRestSec}
            onChange={settings.setDefaultRest}
            size="sm"
            label="Default rest time"
          />
        </SettingRow>
      </SettingsSection>

      {/* Feedback */}
      <SettingsSection title="Feedback">
        <SettingRow icon={Volume2} label="Sound on rest end">
          <Switch
            checked={settings.soundEnabled}
            onChange={settings.toggleSound}
            label="Sound on rest end"
          />
        </SettingRow>
        <SettingRow icon={Vibrate} label="Vibration">
          <Switch
            checked={settings.vibrationEnabled}
            onChange={settings.toggleVibration}
            label="Vibration"
          />
        </SettingRow>
        <SettingRow icon={Bell} label="Notifications">
          <Switch
            checked={settings.notificationsEnabled}
            onChange={handleNotificationToggle}
            label="Notifications"
          />
        </SettingRow>
      </SettingsSection>

      {/* Data */}
      <SettingsSection title="Data">
        <Button variant="secondary" className="w-full justify-start" onClick={handleExport}>
          <Download size={16} aria-hidden="true" /> Export data (JSON)
        </Button>
        <Button
          variant="secondary"
          className="w-full justify-start"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={16} aria-hidden="true" /> Import data (JSON)
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Import backup file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImportFile(f);
          }}
        />
        <Button
          variant="destructive"
          className="w-full justify-start"
          onClick={() => setConfirmClear(true)}
        >
          <Trash2 size={16} aria-hidden="true" /> Clear all data
        </Button>
      </SettingsSection>

      <p className="pb-8 text-center text-xs text-muted-foreground">
        IronTrack · offline-first workout tracker
        <br />
        🔒 All your data stays on this device — nothing is uploaded.
      </p>

      <Dialog
        open={pendingImport !== null}
        onClose={() => setPendingImport(null)}
        title="Import data?"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setPendingImport(null)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleConfirmImport}>
              Import
            </Button>
          </div>
        }
      >
        {pendingImport && (
          <div className="space-y-3 text-sm">
            <dl className="grid grid-cols-2 gap-2">
              <ImportStat label="Workouts" value={pendingImport.sessions.length} />
              <ImportStat label="Templates" value={pendingImport.templates.length} />
              <ImportStat label="Records" value={pendingImport.records.length} />
              <ImportStat label="Exercises" value={pendingImport.exercises.length} />
            </dl>
            <ToggleGroup<ImportMode>
              options={[
                { value: "merge", label: "Merge (keep existing)" },
                { value: "replace", label: "Replace all" },
              ]}
              value={importMode}
              onChange={setImportMode}
              label="Import mode"
              size="sm"
            />
            <p className="text-xs text-muted-foreground">
              {importMode === "replace"
                ? "Replaces everything on this device with the backup contents."
                : "Adds the backup on top of your current data. Matching items are updated."}
            </p>
          </div>
        )}
      </Dialog>

      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear all data?"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleClear}>
              Delete Everything
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          This permanently deletes all workouts, templates and personal records
          from this device. Consider exporting first.
        </p>
      </Dialog>
    </div>
  );
}

function ImportStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted p-2.5 text-center">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {children}
      </div>
    </section>
  );
}

function SettingRow({
  icon: Icon,
  label,
  children,
}: {
  icon?: typeof Bell;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
      <span className="flex items-center gap-2 text-sm font-medium">
        {Icon && <Icon size={16} className="text-muted-foreground" aria-hidden="true" />}
        {label}
      </span>
      {children}
    </div>
  );
}

function NumProfileField({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  suffix: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">
        {label} {suffix && <span aria-hidden="true">({suffix})</span>}
      </span>
      <Input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value ?? ""}
        placeholder="—"
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (Number.isNaN(v)) onChange(null);
          else onChange(Math.min(max, Math.max(min, v)));
        }}
      />
    </label>
  );
}
