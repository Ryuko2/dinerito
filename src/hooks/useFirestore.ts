/**
 * WARNING: Changing collection names or field names here will break existing user data.
 * Always write a migration before deploying.
 */
import { useState, useEffect, useRef } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  DocumentData,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { sanitizeForFirestore } from "@/lib/utils";
import { normalizeDocument } from "@/lib/migrateFirestore";
import {
  saveToLocal,
  loadFromLocal,
  type CollectionStorageKey,
} from "@/lib/persistence";

const COLLECTION_TO_KEY: Record<string, CollectionStorageKey> = {
  expenses: "expenses",
  goals: "goals",
  incomes: "incomes",
  budgets: "budgets",
  debts: "debts",
  recurringExpenses: "recurringExpenses",
};

function getStorageKey(collectionName: string): CollectionStorageKey | null {
  const key = COLLECTION_TO_KEY[collectionName];
  return key ?? null;
}

export function useCollection<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = []
) {
  // Initialize from localStorage first - NEVER start with empty if we have saved data
  const storageKey = getStorageKey(collectionName);
  const initialData = storageKey
    ? (loadFromLocal<T & { id: string }>(storageKey) as (T & { id: string })[])
    : [];

  const [data, setData] = useState<(T & { id: string })[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let unsub: (() => void) | null = null;
    const RETRY_DELAY_MS = 3000;

    function setupListener() {
      const colRef = collection(db, collectionName);
      const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
      unsub = onSnapshot(
        q,
        (snapshot) => {
          if (!mountedRef.current) return;
        const docs = snapshot.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          const base = {
            ...raw,
            id: d.id,
            createdAt: raw.createdAt && typeof (raw.createdAt as { toDate?: () => Date }).toDate === "function"
              ? (raw.createdAt as { toDate: () => Date }).toDate().toISOString?.()
              : raw.createdAt,
            updatedAt: raw.updatedAt && typeof (raw.updatedAt as { toDate?: () => Date }).toDate === "function"
              ? (raw.updatedAt as { toDate: () => Date }).toDate().toISOString?.()
              : raw.updatedAt,
          };
          const normalized = normalizeDocument(collectionName, base, d.id);
          return normalized as unknown as T & { id: string };
        });
          setData(docs);
          setError(null);
          setLoading(false);
          if (storageKey) saveToLocal(storageKey, docs);
        },
        (err) => {
          console.error(`[Firestore] Error in ${collectionName}:`, err);
          if (!mountedRef.current) return;
          setError(err);
          setLoading(false);
          if (storageKey) {
            const local = loadFromLocal<T & { id: string }>(storageKey);
            if (local.length > 0) setData(local as (T & { id: string })[]);
          }
          unsub?.();
          retryTimeoutRef.current = setTimeout(() => {
            retryTimeoutRef.current = null;
            if (mountedRef.current) setupListener();
          }, RETRY_DELAY_MS);
        }
      );
    }

    setupListener();

    return () => {
      mountedRef.current = false;
      unsub?.();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [collectionName, storageKey]);

  const add = async (item: Omit<T, "id">) => {
    const payload = sanitizeForFirestore({
      ...item,
      schemaVersion: "1.0",
      createdAt: serverTimestamp(),
    } as Record<string, unknown>);
    const ref = await addDoc(collection(db, collectionName), payload);
    return ref;
  };

  const update = async (id: string, item: Partial<T>) => {
    const payload = sanitizeForFirestore({
      ...item,
      updatedAt: serverTimestamp(),
    } as Record<string, unknown>);
    await updateDoc(doc(db, collectionName, id), payload);
  };

  const remove = async (id: string) => {
    await deleteDoc(doc(db, collectionName, id));
  };

  return { data, loading, error, add, update, remove };
}
