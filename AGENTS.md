# AGENTS.md — Gym-Workout-App (IronTrack)

Offline-first gym workout tracker PWA. React 19 + TypeScript + Vite 8 + Tailwind v4 + IndexedDB. No backend, no auth.

## Commands

```bash
npm run dev        # dev server (http://localhost:5173)
npm run build      # typecheck (tsc -b) + production build to dist/
npm run preview    # serve production build (test SW/manifest here)
npm test           # vitest, single run
npm run test:watch # vitest watch mode
npm run test:e2e   # Playwright e2e (builds + previews, needs chromium installed)
npm run typecheck  # tsc --noEmit
```

No separate linter is configured; `npm run typecheck` + `npm run build` are the gates. Both must pass before finishing any change.

## Architecture

Layered: UI → stores/services → db → IndexedDB. UI components never call `idb` directly — they go through `src/db/*` repositories or `src/services/*`.

```
src/
├── app entry: main.tsx (SW registration), App.tsx (router, recovery prompt, error boundary)
├── pages/           Home, Workouts (+builder), Exercises, ActiveWorkout (+summary),
│                    History (+detail), Progress, Profile (+onboarding)
├── components/
│   ├── ui/          design-system primitives: Button, Card, Input/Select,
│   │                Dialog (bottom-sheet on mobile, focus trap), Switch/ToggleGroup, Toast, EmptyState
│   ├── exercise/    ExercisePickerDialog (multi/single modes), ExerciseFormDialog (custom CRUD)
│   ├── cardio/      CardioLogDialog (log minutes/distance/calories/notes)
│   ├── layout/      AppLayout (bottom tab bar <md, sidebar ≥md, active banner, skip link)
│   └── workout/     RestTimerBar (global mini timer)
├── stores/
│   ├── activeWorkout.ts  zustand + persist ("irontrack-active-workout") — the in-progress
│   │                     session; written to localStorage on EVERY mutation (recovery).
│   │                     Also: restReason ("set"|"round"), swapExercise (keeps recorded sets).
│   └── settings.ts       zustand + persist ("irontrack-settings") — units, theme, profile,
│                         bodyWeightLog, weeklyPlan, feedback toggles, default rest, smart
│                         rest defaults, logBodyWeight/removeBodyWeightEntry, setPlanEntry/
│                         removePlanEntry.
├── services/        workoutService (finishWorkout = PR detection + persistence),
│                    statsService (weekly summary, streaks, progression series,
│                    muscleVolumePerWeek, bodyWeightTrend, cardioThisWeek — pure)
├── db/              idb wrapper: db.ts (schema v2 + migrations), exercises/templates/
│                    sessions/records/cardioEntries repos; exercises.ts owns custom-exercise
│                    helpers (makeCustomExerciseId, deleteExercise, exerciseInUse)
├── data/exercises.ts ~44-exercise seed library, auto-seeded into IDB on first run;
│                    data/cardio.ts (CARDIO_ACTIVITIES, DISTANCE_ACTIVITIES)
├── hooks/           useRestTimer (timestamp countdown + sound/vibrate/notification),
│                    useApplyTheme (.dark class on <html>), useAsync,
│                    useRadiogroupArrows (WAI-ARIA arrow-key radio navigation)
├── utils/           calculations.ts (volume, Epley 1RM, detectSetPRs, suggestRestSec — pure),
│                    supersets.ts (block/round helpers — pure),
│                    strengthStandard.ts (big-lift bodyweight-ratio standards + classify),
│                    plates.ts, units.ts (kg internal ↔ kg/lb display), format.ts (durations/dates)
├── types/index.ts   all domain types (incl. supersetGroup, SetRecord.rpe/note, BodyWeightEntry)
└── styles/globals.css  Tailwind v4 theme; semantic CSS variables (--background, --primary…)
```

e2e/ — Playwright specs (onboarding, custom-exercise CRUD, full build→train→finish flow). `seedOnboarded(page)` via `page.addInitScript`; the config in `playwright.config.ts` spins up `vite preview` (production build + SW) automatically.

### Data model

- **Exercise** — seeded catalog + custom exercises (id, muscle group, equipment, type, instructions); custom ids use the `ex-custom-` prefix
- **WorkoutTemplate** — reusable plan; `exercises[].sets[]` hold targetReps/targetWeight/restSec; `supersetGroup` links consecutive exercises into round-based blocks
- **WorkoutSession** — finished record; per-set SetRecord `{weight(kg), reps, completedAt}` plus optional `rpe`/`note`
- **CardioEntry** — standalone activity log (`{activity, durationMin, distanceKm?, calories?, notes?, date}`) in its own IDB store; appears in History + weekly stats
- **PersonalRecord** — one row per PR hit; types: `max-weight`, `best-1rm`, `best-set-volume`. History is kept (multiple rows per type across sessions); resolve bests via `getBestRecords()`

IndexedDB stores: `exercises`, `templates`, `sessions`, `records`, `cardioEntries`. Schema bump requires a new version + `if (oldVersion < N)` guard in `src/db/db.ts`. Body-weight log and `weeklyPlan` live in the settings store (localStorage), not IDB.

## Critical conventions & gotchas

- **Weights are always kg internally.** Convert only at render/input via `src/utils/units.ts`.
- **Rest timers are absolute timestamps** (`restEndsAt` in the store), never countdown state — this is what makes them survive reloads and navigation. Don't refactor to tick-down integers.
- **Active-workout recovery:** the persisted store must be written synchronously on every set completion; `App.tsx` prompts Resume/Discard once per app load.
- **Dark mode** = `.dark` class on `<html>` + semantic tokens in `globals.css`. Never hard-code palette colors for surfaces/text; add a token instead (`--success`, `--destructive`, etc.). Tailwind v4 syntax: `@custom-variant dark (&:where(.dark, .dark *))`.
- **Vite 8 uses Rolldown**: `manualChunks` must be a function, not an object map.
- **Tests**: vitest with jsdom, globals enabled via `vitest/globals` in tsconfig but tests import from `vitest` explicitly anyway; `vitest.setup.ts` loads `fake-indexeddb/auto` + jest-dom. Test files live next to source as `*.test.ts(x)`.
- Keep inputs ≥16px and tap targets ≥44px (mobile-first, gym use); numeric inputs use `inputMode="decimal"`.
- PWA: manifest/icons/SW generated by vite-plugin-pwa (`vite.config.ts`); verify offline behavior against `npm run preview`, not dev server.

## Definition of done for features

1. `npm run typecheck` passes
2. `npm test` passes (add/extend tests for logic: calculations, PR detection, persistence, timer)
3. `npm run build` succeeds
4. `npm run test:e2e` passes — the suite runs on both a desktop and a Pixel 7 mobile profile, so mobile regressions (viewport overflow, tab-bar/dialog overlap) are caught automatically.

## Current Status (updated Aug 28, 2026)

- **Live:** https://ritchegerona.github.io/Gym-Workout-App · Repo: `ritchegerona/Gym-Workout-App` (public, MIT)
- **Quality gates:** 131/131 unit tests · 24/24 Playwright e2e (desktop Chromium + Pixel 7 + iPhone 8 + iPhone 17 Pro Max, incl. dialog-above-tab-bar & recovery/resume flows on every mobile profile) · Lighthouse 94–95 perf / 100 a11y / 100 BP / 100 SEO · CI auto-deploys `main` → Pages (title: typecheck + unit tests; typecheck of e2e not covered — e2e/ sits outside tsconfig include)
- **Shipped v1.2.0:** custom exercise CRUD, supersets/circuits (builder grouping + round-based active flow + swap), mid-workout exercise swap, RPE/set notes, smart rest defaults by exercise type, body-weight logging with trend sparkline, weekly muscle-group volume chart, 1RM calculator + strength standards, Dialog focus trap + skip link, Playwright e2e suite
- **Shipped v1.3.0:** body-weight trend chart on Progress, Playwright e2e CI job, cardio activities (schema v2 `cardioEntries` store + log dialog + History timeline), weekly planner (`/planner`, Home shows today's scheduled workout/cardio, cardio "This Week" stat), WAI-ARIA arrow-key radiogroup navigation (RPE, filters, time range, planner, exercise type)
- **Deploy mechanics:** CI sets `BASE_PATH=/<repo-name>/`; GitHub Actions pinned to node24-compatible majors (checkout@v7, setup-node@v7, configure-pages@v6, upload-pages-artifact@v5, deploy-pages@v5). The `e2e` job installs chromium + webkit and runs `npm run test:e2e` in parallel with the Pages deploy.

### Next up (in order)
1. Cardio on Progress page (minutes per week line/bar chart) + Planner day ordering/editing polish
2. Reminders/notifications for scheduled plan days (Settings toggle + Home banner)
3. Deeper keyboard/screen-reader pass (e.g. table navigation in session detail, custom select keyboard ops)
4. JSON export/import for cardio + planner data

Deferred to v3: optional accounts + cloud sync.
