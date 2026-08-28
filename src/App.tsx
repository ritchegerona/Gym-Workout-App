import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppLayout } from "./components/layout/AppLayout";
import { ToastProvider } from "./components/ui/Toast";
import { Dialog } from "./components/ui/Dialog";
import { Button } from "./components/ui/Button";
import { useActiveWorkout } from "./stores/activeWorkout";
import { useApplyTheme } from "./hooks/useApplyTheme";
import { ensureExercisesSeeded } from "./db/exercises";
import HomePage from "./pages/Home/HomePage";
import WorkoutsPage from "./pages/Workouts/WorkoutsPage";
import WorkoutBuilderPage from "./pages/Workouts/WorkoutBuilderPage";
import ActiveWorkoutPage from "./pages/ActiveWorkout/ActiveWorkoutPage";
const HistoryPage = lazy(() => import("./pages/History/HistoryPage"));
const SessionDetailPage = lazy(() => import("./pages/History/SessionDetailPage"));
const ProfilePage = lazy(() => import("./pages/Profile/ProfilePage"));
const CompleteSummaryPage = lazy(
  () => import("./pages/ActiveWorkout/CompleteSummaryPage"),
);
import OnboardingPage from "./pages/Profile/OnboardingPage";
import { PwaUpdater } from "./components/PwaPrompts";

const ExerciseLibraryPage = lazy(
  () => import("./pages/Exercises/ExerciseLibraryPage"),
);
const ProgressPage = lazy(() => import("./pages/Progress/ProgressPage"));
const PlannerPage = lazy(() => import("./pages/Planner/PlannerPage"));

function RecoveryPrompt({ onClose }: { onClose: () => void }) {
  const name = useActiveWorkout((s) => s.name);
  const discardWorkout = useActiveWorkout((s) => s.discardWorkout);

  return (
    <Dialog
      open
      onClose={onClose}
      title="Active workout found"
      footer={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              discardWorkout();
              onClose();
            }}
          >
            Discard
          </Button>
          <Button className="flex-1" onClick={onClose}>
            Resume Workout
          </Button>
        </div>
      }
    >
      <p className="text-sm text-muted-foreground">
        You have an unfinished workout{ name ? <> — <strong className="text-foreground">{name}</strong></> : null}.
        Would you like to resume where you left off?
      </p>
    </Dialog>
  );
}

export default function App() {
  useApplyTheme();

  const [showRecovery, setShowRecovery] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureExercisesSeeded().finally(() => {
      if (cancelled) return;
      // Only prompt for recovery once per app load
      if (useActiveWorkout.getState().sessionId) {
        useActiveWorkout.setState({ restEndsAt: null, restDurationSec: 0 });
        setShowRecovery(true);
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <PwaUpdater />
          {showRecovery && (
            <RecoveryPrompt onClose={() => setShowRecovery(false)} />
          )}
          <Routes>
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/workouts" element={<WorkoutsPage />} />
              <Route path="/workouts/new" element={<WorkoutBuilderPage />} />
              <Route path="/workouts/:id/edit" element={<WorkoutBuilderPage />} />
              <Route
                path="/exercises"
                element={
                  <Suspense>
                    <ExerciseLibraryPage />
                  </Suspense>
                }
              />
              <Route
                path="/active"
                element={
                  <Suspense>
                    <ActiveWorkoutPage />
                  </Suspense>
                }
              />
              <Route
                path="/complete/:id"
                element={
                  <Suspense>
                    <CompleteSummaryPage />
                  </Suspense>
                }
              />
              <Route
                path="/history"
                element={
                  <Suspense>
                    <HistoryPage />
                  </Suspense>
                }
              />
              <Route
                path="/history/:id"
                element={
                  <Suspense>
                    <SessionDetailPage />
                  </Suspense>
                }
              />
              <Route
                path="/progress"
                element={
                  <Suspense>
                    <ProgressPage />
                  </Suspense>
                }
              />
              <Route
                path="/planner"
                element={
                  <Suspense>
                    <PlannerPage />
                  </Suspense>
                }
              />
              <Route
                path="/profile"
                element={
                  <Suspense>
                    <ProfilePage />
                  </Suspense>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
