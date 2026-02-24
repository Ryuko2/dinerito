# Sheriff de Gastos - Data Audit & Persistence

## 1. AUDIT SUMMARY

### Data Types & Storage (Before Fix)

| Data Type | Collection/Key | Storage | At Risk? |
|-----------|----------------|---------|----------|
| Expenses | `expenses` | Firestore | Yes - no localStorage backup |
| Goals | `goals` | Firestore | Yes - no localStorage backup |
| Incomes | `incomes` | Firestore | Yes - no localStorage backup |
| Budgets | `budgets` | Firestore | Yes - no localStorage backup |
| Legacy (pre-Firebase) | `sheriff-expenses`, `sheriff-goals` | localStorage | Yes - lost when app switched to Firestore |

### Firestore Collections & Document Structure

**expenses** (matches your Firestore screenshot):
- `amount` (number)
- `brand` (string)
- `card` (string)
- `category` (string)
- `createdAt` (Timestamp)
- `date` (string, YYYY-MM-DD)
- `description` (string)
- `paidBy` (string: "boyfriend" | "girlfriend")

**goals**, **incomes**, **budgets**: Same pattern with `createdAt`, `id` from Firestore.

### Root Cause of "Data Not Showing"

1. **Firestore config**: If `.env` / `.env.local` is missing or wrong during `npm run build`, the deployed app gets `undefined` Firebase config → silent connection failure.
2. **No localStorage fallback**: When Firestore failed, the app showed empty.
3. **Legacy data**: Users who had data in old localStorage keys (`sheriff-expenses`, `sheriff-goals`) before the Firebase migration lost it—the app never migrated it to Firestore.

---

## 2. IMPLEMENTED FIXES

### Persistent Storage
- **Firestore** remains primary.
- **localStorage** backup: every Firestore read/write syncs to `sheriff-*-v2` keys.
- **Initial load**: State is initialized from localStorage first, so the UI is never empty when data exists.
- **On Firestore error**: App falls back to localStorage and shows a banner.

### Backup & Restore
- **Export**: Settings (gear) → "Exportar mis datos" → downloads JSON with `dataVersion`, `exportedAt`, and all collections.
- **Import**: Settings → "Importar datos" → upload JSON to restore. Uses `addDoc` (no overwrite).

### Schema Versioning
- `schemaVersion: "1.0"` added to new documents.
- `DATA_SCHEMA_VERSION` in `persistence.ts` for future migrations.

### Recovery for Existing Users
- One-time migration on load: if old keys `sheriff-expenses` / `sheriff-goals` exist and migration hasn’t run, data is uploaded to Firestore and legacy keys are cleared.

### Firestore Protections
- New documents use `addDoc` (no overwrite).
- `updateDoc` merges fields.
- Warnings added in `firebase.ts` and `useFirestore.ts` about changing collection/field names.

---

## 3. DEPLOYMENT CHECKLIST

Before every deploy:
- [ ] Ensure `.env.local` has valid `VITE_FIREBASE_*` values (used at build time).
- [ ] Run `npm run build` locally to confirm Firebase config is embedded.
- [ ] Do not change collection names (`expenses`, `goals`, `incomes`, `budgets`) without a migration.
- [ ] Do not change field names in types without a migration.

---

## 4. FILES TOUCHING FIRESTORE

- `src/lib/firebase.ts` – Firebase init
- `src/hooks/useFirestore.ts` – Firestore queries, add/update/remove
- `src/pages/Index.tsx` – Import handler (addDoc)
- `src/lib/migrateLegacy.ts` – Legacy migration (addDoc)
