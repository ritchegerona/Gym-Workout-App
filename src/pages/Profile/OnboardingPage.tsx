import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dumbbell, Zap } from "lucide-react";
import { TRAINING_GOALS, useSettings } from "../../stores/settings";
import { ToggleGroup } from "../../components/ui/Switch";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { cn } from "../../lib/utils";

export function OnboardingPage() {
  const navigate = useNavigate();
  const settings = useSettings();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(settings.profile.name);
  const [goal, setGoal] = useState<(typeof TRAINING_GOALS)[number] | null>(
    settings.profile.goal,
  );

  function finish() {
    settings.updateProfile({ name: name.trim(), goal });
    settings.setOnboarded();
    navigate("/", { replace: true });
  }

  const steps = [
    {
      title: "Welcome to IronTrack",
      icon: Dumbbell,
      body: (
        <div className="space-y-3 text-center">
          <p className="text-sm leading-relaxed text-muted-foreground">
            A fast, offline-first workout tracker. Plan your routines, log sets
            in seconds, and watch your strength grow.
          </p>
          <ul className="mx-auto max-w-xs space-y-2 text-left text-sm">
            <Feature>Build reusable workouts</Feature>
            <Feature>Log sets with two taps</Feature>
            <Feature>Automatic rest timer</Feature>
            <Feature>Personal record detection</Feature>
            <Feature>🔒 Your data never leaves your device</Feature>
          </ul>
        </div>
      ),
    },
    {
      title: "Choose your units",
      icon: null,
      body: (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            You can change this anytime in Profile.
          </p>
          <ToggleGroup<"kg" | "lb">
            options={[
              { value: "kg", label: "Kilograms (kg)" },
              { value: "lb", label: "Pounds (lb)" },
            ]}
            value={settings.unit}
            onChange={settings.setUnit}
            label="Weight units"
          />
        </div>
      ),
    },
    {
      title: "Your profile (optional)",
      icon: null,
      body: (
        <label className="block space-y-2 text-left">
          <span className="text-sm font-medium">What should we call you?</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            maxLength={40}
          />
        </label>
      ),
    },
    {
      title: "What's your goal?",
      icon: Zap,
      body: (
        <div className="space-y-1.5">
          {TRAINING_GOALS.map((g) => (
            <button
              key={g}
              onClick={() => setGoal(g)}
              aria-pressed={goal === g}
              className={cn(
                "w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                goal === g
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      ),
    },
  ];

  const stepData = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="flex min-h-dvh flex-col bg-background px-6 py-10">
      {/* Progress dots */}
      <div
        className="mx-auto mb-8 flex w-full max-w-md gap-1.5"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={step + 1}
      >
        {steps.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= step ? "bg-primary" : "bg-muted",
            )}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 text-center">
        {stepData.icon && (
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground">
            <stepData.icon size={30} aria-hidden="true" />
          </span>
        )}
        <h1 className="text-2xl font-bold tracking-tight">{stepData.title}</h1>
        <div className="w-full">{stepData.body}</div>
      </div>

      <div className="mx-auto mt-8 w-full max-w-md space-y-2 pb-safe">
        <Button size="lg" className="w-full" onClick={() => (isLast ? finish() : setStep(step + 1))}>
          {isLast ? "Let's Go 💪" : "Continue"}
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => (isLast ? finish() : setStep(step + 1))}
        >
          Skip
        </Button>
      </div>
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary"
        aria-hidden="true"
      >
        ✓
      </span>
      {children}
    </li>
  );
}

// Route wrapper so App.tsx can mount it outside AppLayout if needed
export default OnboardingPage;
