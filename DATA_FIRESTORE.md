# Firestore Data Architecture

## Source of Truth

**Firestore is the single source of truth** for all user data (expenses, goals, incomes, budgets).

- Data is read via `onSnapshot` on every app load — no hardcoded arrays or in-memory-only state.
- Data is written via `addDoc`, `updateDoc`, `deleteDoc` — never `setDoc` on initialization.
- **GitHub deploys only affect frontend code** — they do NOT touch the database. Data persists across deployments.

## localStorage Role

- **Cache/fallback only**: localStorage holds a copy of Firestore data for:
  - Instant display on load (before first Firestore response)
  - Offline/error fallback when Firestore is unreachable
- localStorage is **overwritten by Firestore** when `onSnapshot` receives new data — never the reverse.
- No code resets or overwrites Firestore collections on deploy or app init.

## Firebase Config

- Ensure `.env` / `.env.production` has correct `VITE_FIREBASE_*` variables for your project.
- A dev vs prod mismatch (wrong project ID) would point to a different database — verify `VITE_FIREBASE_PROJECT_ID` matches your production Firestore.

## Migrations

- `runLegacyMigration()` runs once when old localStorage keys exist and `sheriff-migrated-v1` is not set.
- It **adds** documents to Firestore (from legacy localStorage) and then clears legacy keys — it never deletes or overwrites existing Firestore data.
