/**
 * PERSISTENT DATA STORAGE LAYER
 * =============================
 * WARNING: Changing collection names or field names here will break existing user data.
 * Always write a migration before deploying.
 *
 * This module provides:
 * - localStorage backup of all Firestore data
 * - Fallback when Firestore fails
 * - One-time migration from old localStorage keys
 * - Export/Import for manual backups
 */

export const DATA_SCHEMA_VERSION = '1.0';

export const STORAGE_KEYS = {
  expenses: 'sheriff-expenses-v2',
  goals: 'sheriff-goals-v2',
  incomes: 'sheriff-incomes-v2',
  budgets: 'sheriff-budgets-v2',
  migrated: 'sheriff-migrated-v1',
  schemaVersion: 'sheriff-schema-version',
} as const;

export type CollectionStorageKey = 'expenses' | 'goals' | 'incomes' | 'budgets';

// Legacy keys (pre-Firestore migration)
const LEGACY_KEYS = {
  expenses: 'sheriff-expenses',
  goals: 'sheriff-goals',
} as const;

export interface PersistedData {
  dataVersion: string;
  exportedAt: string;
  expenses: unknown[];
  goals: unknown[];
  incomes: unknown[];
  budgets: unknown[];
}

export function saveToLocal<T>(key: keyof typeof STORAGE_KEYS, data: T[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
    localStorage.setItem(STORAGE_KEYS.schemaVersion, DATA_SCHEMA_VERSION);
  } catch (e) {
    console.warn('localStorage save failed:', e);
  }
}

export function loadFromLocal<T>(key: CollectionStorageKey): T[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[key]);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function hasLegacyData(): boolean {
  return !!(localStorage.getItem(LEGACY_KEYS.expenses) || localStorage.getItem(LEGACY_KEYS.goals));
}

export function loadLegacyData(): { expenses: unknown[]; goals: unknown[] } {
  const expenses = (() => {
    try {
      const raw = localStorage.getItem(LEGACY_KEYS.expenses);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })();
  const goals = (() => {
    try {
      const raw = localStorage.getItem(LEGACY_KEYS.goals);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })();
  return { expenses, goals };
}

export function clearLegacyData(): void {
  try {
    localStorage.removeItem(LEGACY_KEYS.expenses);
    localStorage.removeItem(LEGACY_KEYS.goals);
    localStorage.setItem(STORAGE_KEYS.migrated, 'true');
  } catch (e) {
    console.warn('Failed to clear legacy data:', e);
  }
}

export function hasMigrated(): boolean {
  return localStorage.getItem(STORAGE_KEYS.migrated) === 'true';
}

export function exportAllData(data: {
  expenses: unknown[];
  goals: unknown[];
  incomes: unknown[];
  budgets: unknown[];
}): PersistedData {
  return {
    dataVersion: DATA_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    expenses: data.expenses,
    goals: data.goals,
    incomes: data.incomes,
    budgets: data.budgets,
  };
}

export function importData(json: string): PersistedData | null {
  try {
    const parsed = JSON.parse(json) as PersistedData;
    if (!parsed.dataVersion || !Array.isArray(parsed.expenses)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function downloadBackup(data: PersistedData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sheriff-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
