/**
 * One-time migration: recover data from old localStorage keys (sheriff-expenses, sheriff-goals)
 * and upload to Firestore. Run on first app load.
 */
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { sanitizeForFirestore } from "./utils";
import {
  hasLegacyData,
  loadLegacyData,
  clearLegacyData,
  hasMigrated,
} from "./persistence";

export async function runLegacyMigration(): Promise<boolean> {
  if (hasMigrated() || !hasLegacyData()) return false;

  const { expenses, goals } = loadLegacyData();
  if (expenses.length === 0 && goals.length === 0) {
    clearLegacyData();
    return false;
  }

  try {
    for (const e of expenses) {
      const item = e as Record<string, unknown>;
      if (!item || typeof item !== "object") continue;
      const { id: _id, ...rest } = item;
      await addDoc(collection(db, "expenses"), sanitizeForFirestore({
        ...rest,
        schemaVersion: "1.0",
        createdAt: rest.createdAt ? new Date(String(rest.createdAt)) : serverTimestamp(),
      }));
    }
    for (const g of goals) {
      const item = g as Record<string, unknown>;
      if (!item || typeof item !== "object") continue;
      const { id: _id, ...rest } = item;
      await addDoc(collection(db, "goals"), sanitizeForFirestore({
        ...rest,
        schemaVersion: "1.0",
        createdAt: rest.createdAt ? new Date(String(rest.createdAt)) : serverTimestamp(),
      }));
    }
    clearLegacyData();
    return true;
  } catch (err) {
    console.error("Legacy migration failed:", err);
    return false;
  }
}
