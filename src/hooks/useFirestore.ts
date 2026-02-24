/**
 * WARNING: Changing collection names or field names here will break existing user data.
 * Always write a migration before deploying.
 */
import { useState, useEffect } from "react";
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

  useEffect(() => {
    const colRef = collection(db, collectionName);
    const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => {
          const raw = d.data();
          return {
            ...raw,
            id: d.id,
            createdAt: raw.createdAt?.toDate?.()?.toISOString?.() ?? raw.createdAt,
            updatedAt: raw.updatedAt?.toDate?.()?.toISOString?.() ?? raw.updatedAt,
          } as unknown as T & { id: string };
        });
        setData(docs);
        setError(null);
        setLoading(false);
        // Persist to localStorage on every Firestore update
        if (storageKey) saveToLocal(storageKey, docs);
      },
      (err) => {
        console.error(`Error en ${collectionName}:`, err);
        setError(err);
        setLoading(false);
        // On Firestore error: keep localStorage data (already in state from init)
        if (storageKey) {
          const local = loadFromLocal<T & { id: string }>(storageKey);
          if (local.length > 0) setData(local as (T & { id: string })[]);
        }
      }
    );
    return () => unsub();
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
