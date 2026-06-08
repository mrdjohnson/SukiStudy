<div align="center">
  <h1>SukiStudy</h1>
  <p><strong>A polished, offline-capable Japanese study app built around WaniKani progress, focused practice, and playful micro-interactions.</strong></p>
  <p>
    <a href="https://sukistudy.vercel.app">Live app</a>
    |
    <a href="https://github.com/mrdjohnson/SukiStudy">Repository</a>
  </p>
  <img src="public/og-image.png" alt="SukiStudy preview" width="720" />
</div>

<br />

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=111111" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178c6?style=for-the-badge&logo=typescript&logoColor=ffffff" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646cff?style=for-the-badge&logo=vite&logoColor=ffffff" />
  <img alt="PWA" src="https://img.shields.io/badge/PWA-Offline_ready-5a0fc8?style=for-the-badge" />
</p>

## Overview

SukiStudy is a gamified WaniKani companion for practicing Japanese kana, radicals, kanji, and vocabulary. It syncs with a user's WaniKani account, stores study data locally, and turns review material into focused games such as typing practice, matching pairs, memory match, audio listening, and reading quizzes.

This project is also a frontend engineering case study. The newest redesign moves the app away from a traditional nav-heavy layout and into a minimal, immersive dashboard: study items take center stage, while every secondary workflow opens in a drawer or sheet above the dashboard. The result feels closer to a native mobile learning app than a database-backed web dashboard.

> SukiStudy is intended to supplement WaniKani study, not replace WaniKani. WaniKani is a paid service worth supporting.

## What This Shows

- Product-minded UI architecture: a minimal dashboard, drawer-based flows, contextual options, and device-aware wallpaper presentation.
- React application design: shared hooks, route composition, local-first data access, typed domain models, lazy-loaded surfaces, and reusable game containers.
- Frontend polish: responsive layouts, animation-aware interactions, Japanese typography controls, custom icons, app-shell styling, and PWA behavior.
- Practical engineering judgment: syncing is opt-in, guest mode works without a WaniKani token, and query logic is centralized so dashboard, lessons, reviews, and tests stay aligned.

## Product Highlights

### Immersive Study Dashboard

The dashboard is intentionally sparse. Instead of showing many counters and cards, it samples available study items and presents one item at a time with large Japanese type, audio affordances, and quick access to practice.

Key choices:

- Keep the learner in context by opening Browse, Games, Settings, Statistics, Reviews, and Lessons as drawer routes above the dashboard.
- Replace the old navbar with an options sheet so global actions are available without competing with the active study item.
- Use wallpaper and typography settings to make the app feel personal without hiding the learning content.

### Practice Modes

SukiStudy includes multiple practice formats so users can change the cognitive shape of review:

- Memory Match
- Quick Quiz
- Matching Pairs
- Typing Practice
- Hiragana Connect
- Kanji Readings
- Word Recall
- Audio Listen
- Custom sessions

Each mode consumes the same typed game-item model, which keeps the game layer flexible while avoiding one-off data pipelines per game.

### WaniKani-Aware Sync

Authenticated users can sync subjects, assignments, study materials, and encounter results. The app also supports kana-first guest mode, so new users can practice hiragana and katakana without connecting an account.

The redesign makes WaniKani item downloads explicit: users can choose whether to download large WaniKani datasets for offline practice and automatic updates.

### Offline-Ready PWA

SukiStudy is built as an installable PWA. It uses IndexedDB-backed local data, service-worker app caching, and worker-powered sync so practice can continue with minimal network dependency.

## Design Considerations

### Dashboard First, Everything Else As Context

The redesign treats the dashboard as the user's home base. Rather than navigating away from the learning environment, secondary pages appear as drawers. This reduces context switching and gives mobile users a familiar sheet-based interaction model.

### Progressive Disclosure

The app has a lot of power: sync, game filters, WaniKani levels, hidden subject types, typography, notifications, wallpaper, stats, and logs. The new options panel groups those controls behind a small, discoverable surface instead of presenting them all in the main viewport.

### Local-First Study Data

Study apps should not feel fragile. SukiStudy stores subjects, assignments, preferences, encounters, and logs in SignalDB collections backed by IndexedDB. React screens subscribe to local collections, while sync workers refresh data in the background.

### Shared Query Logic

Lesson, review, dashboard, and game flows all need subtly different slices of the same subject data. The query layer centralizes rules for allowed subject types, level bounds, review availability, lessons, and kana inclusion. This keeps UI features from drifting apart as preferences evolve.

### Respect For User Bandwidth

WaniKani data can be large. The app asks before downloading account-backed WaniKani items and keeps kana available independently. That lets guest mode and lightweight offline practice work without forcing a full sync.

### Japanese Reading Experience

The UI includes selectable Japanese fonts, romaji/kana toggles, audio playback, mnemonic artwork, WaniKani hints, readings by type, context sentences, and related subjects. The flashcard surface is built to make rich study data readable on small screens.

## Engineering Notes

### Frontend Architecture

- React 19 with React Router for public, authenticated, and drawer-based route layers.
- Mantine 9 and Tailwind CSS for component primitives, responsive behavior, and utility-level polish.
- SignalDB plus IndexedDB for reactive local collections.
- Comlink worker sync for WaniKani data ingestion without blocking the UI thread.
- Workbox service worker for app-shell caching and PWA offline support.
- Shared settings store for content filters, sync preferences, notifications, fonts, and wallpaper.

### Data Flow

```text
WaniKani API / local kana data
        |
        v
Sync service worker
        |
        v
SignalDB collections persisted to IndexedDB
        |
        v
Shared query helpers and React hooks
        |
        v
Dashboard, Browse, Games, Reviews, Settings
```

### Quality Practices

- TypeScript project references for app, worker, core, and node/server code.
- Vitest coverage for shared game-item query behavior and hooks.
- Playwright coverage for offline PWA behavior.
- Dependency-cruiser scripts for architectural boundaries and circular dependency checks.
- Prettier via lint-staged and Husky.

## Tech Stack

| Area       | Tools                                              |
| ---------- | -------------------------------------------------- |
| UI         | React, Mantine, Tailwind CSS, Tabler Icons, Motion |
| Routing    | React Router                                       |
| Local data | SignalDB, IndexedDB, Maverick JS signals           |
| Sync       | WaniKani API, Comlink workers                      |
| PWA        | Vite PWA, Workbox service worker                   |
| Charts     | Recharts, Mantine Charts                           |
| Testing    | Vitest, Testing Library, Playwright                |
| Deployment | Vercel                                             |

## Running Locally

```bash
yarn install
yarn dev
```

The dev server runs on:

```text
https://localhost:3000
```

Useful scripts:

```bash
yarn tsc
yarn test
yarn test:e2e
yarn build
yarn generate-wallpapers
yarn check-deps
```

Push notifications require VAPID keys. WaniKani sync requires a WaniKani API token entered in the app.

## Project Structure

```text
src/
  components/       Reusable UI, drawers, flashcards, game shells
  components/settings/
                    Appearance and notification panels
  core/             Domain types, SignalDB collections, preference stores
  hooks/            Reactive data hooks and game logic
  migrations/       Startup migrations for persisted client state
  pages/            Route-level product surfaces
  pages/games/      Individual practice modes
  serviceWorker/    Caching and push-notification behavior
  services/         WaniKani, sync, encounters, notifications
  utils/            Kana, fonts, query support, transforms, formatting
test/               Unit and hook-test utilities
tests/              Playwright tests
server/             Notification API and scheduled tasks
scripts/            Wallpaper/font/data generation helpers
```

## Roadmap

- Continue refining the dashboard recommendation model.
- Add richer progress visualizations for practice history.
- Expand custom sessions and saved study collections.
- Improve automated visual regression coverage for the new drawer-first UI.

## Credits

- [WaniKani](https://www.wanikani.com/) for the core learning system and API.
- [Tofugu](https://www.tofugu.com/) for kana learning resources.
- [Amanda Bear's WaniKani mnemonic artwork](https://community.wanikani.com/t/wk-mnemonic-art-for-kanji-levels-1-7-radical-levels-1-10/47656) for community mnemonic visuals.
- Japanese font families from Google Fonts.
