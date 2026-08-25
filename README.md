<div align="center">

<img src="public/icon-512.png" width="88" alt="IronTrack logo" />

# IronTrack

**Fast, offline-first gym workout tracker — built as a PWA.**

*Plan → Train → Track → Progress*

[![Deploy](https://github.com/ritchegerona/Gym-Workout-App/actions/workflows/deploy.yml/badge.svg)](https://github.com/ritchegerona/Gym-Workout-App/actions/workflows/deploy.yml)
[![Tests](https://img.shields.io/badge/tests-vitest-green)](#testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

**Live app:** [ritchegerona.github.io/Gym-Workout-App](https://ritchegerona.github.io/Gym-Workout-App/)

</div>

---

IronTrack is a mobile-first workout tracker designed for **real gym use**: pull out your phone between sets, log your lift in two taps, and get back to training. It works fully offline, installs to your home screen like a native app, and keeps every byte of data on your device — no account, no cloud, no tracking.

## Features

| | |
|---|---|
| 🏋️ **Workout templates** | Build reusable routines (Push Day, Full Body…) with sets × reps × weight × rest. Favorite, duplicate, edit anytime. |
| ⚡ **Two-tap set logging** | Large, gym-glove-friendly controls. Completing a set auto-starts the rest timer and pre-fills the next set. |
| ⏱️ **Persistent rest timer** | Timestamp-based — survives navigation *and* full app reloads. Sound, vibration, and notifications when rest ends. |
| 🏆 **Automatic PR detection** | Max weight, estimated 1RM (Epley), and best set volume — detected live mid-workout and stored as history. |
| 📈 **Progress dashboard** | Workouts-per-week chart, per-exercise weight/reps/e1RM/volume progression, weekly volume summary, streaks. |
| 📜 **Workout history** | Chronological log with date/workout filters; detailed session view with per-set breakdowns. |
| 🔒 **Private by design** | 100% local storage (IndexedDB + localStorage). No backend, no accounts, nothing uploaded. |
| 📲 **Installable PWA** | Add to home screen on iOS & Android, standalone display mode, offline-ready service worker. |
| 💾 **Data ownership** | One-click JSON export/import with merge or replace — your data is portable forever. |
| 🌗 **Dark mode** | System-aware light/dark themes with semantic design tokens. |

## Tech stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) + [Vite 8](https://vite.dev)
- [Tailwind CSS v4](https://tailwindcss.com) — semantic design tokens, dark variant
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via [`idb`](https://github.com/jakearchibald/idb) — structured workout storage
- [Zustand](https://zustand.docs.pmnd.rs) with `persist` — continuously persisted active-workout state
- [Recharts](https://recharts.org) — responsive progress charts
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app) — manifest + Workbox service worker
- [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) + `fake-indexeddb`

## Getting started

```bash
git clone https://github.com/ritchegerona/Gym-Workout-App.git
cd Gym-Workout-App
npm install
npm run dev        # http://localhost:5173
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Typecheck + production build to `dist/` (+ SPA `404.html` fallback) |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Vitest watch mode |
| `npm run typecheck` | TypeScript project check |

> **Offline testing:** verify PWA behavior against `npm run preview` or the deployed site — the dev server does not exercise the service worker.

## Deployment

The app deploys automatically to **GitHub Pages** on every push to `main` via [.github/workflows/deploy.yml](.github/workflows/deploy.yml):

1. Installs dependencies
2. Runs typecheck + tests
3. Builds with the correct base path (`BASE_PATH=/<repo-name>/`)
4. Publishes `dist/` to Pages

To host it yourself, build statically and serve `dist/` from any static file server:

```bash
BASE_PATH=/ npm run build   # root-domain deployments
npx serve dist
```

## Project structure

```
src/
├── components/        UI primitives, layout shell, shared dialogs
├── pages/             One folder per route (Home, Workouts, ActiveWorkout, …)
├── services/          Business logic: PR detection, stats, import/export
├── stores/            Zustand stores (active workout, settings) — persisted
├── db/                Typed IndexedDB repositories
├── data/              Seed exercise library (~44 exercises)
├── hooks/             Rest timer, wake lock, theme, install prompt
├── utils/             Pure helpers: volume, Epley 1RM, units, formatting
├── types/             Domain types
└── styles/            Tailwind v4 theme + semantic CSS variables
```

Layered architecture: **UI → stores/services → db → IndexedDB**. UI never touches IndexedDB directly, which keeps the door open for a future sync backend.

## Testing

76 unit/integration tests cover the parts that must never break:

- Volume math & Epley 1RM · PR detection rules
- IndexedDB persistence (via `fake-indexeddb`) · template/session CRUD
- Active-workout store incl. crash-recovery rehydration
- Rest timer countdown behavior · settings persistence
- End-to-end flow: plan → train → finish → history → records

```bash
npm test
```

## Privacy

IronTrack collects nothing. There is no server, no analytics, and no sign-in.
All workouts, templates, and personal records live exclusively in your browser's
storage on your device. Clearing browser data deletes them — use
**Profile → Data → Export** for backups.

## Roadmap

See [open work items](https://github.com/ritchegerona/Gym-Workout-App/issues): barbell plate calculator, custom exercises, supersets, body-weight tracking, muscle-group volume balance, cardio activities, and more.

## License

[MIT](LICENSE) © Ritche Gerona
