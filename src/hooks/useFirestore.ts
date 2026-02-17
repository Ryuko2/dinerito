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
  orderBy,
  DocumentData,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useCollection<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const colRef = collection(db, collectionName);
    const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt,
          } as T & { id: string };
        });
        setData(docs);
        setLoading(false);
      },
      (err) => {
        console.error(`Error en ${collectionName}:`, err);
        setError(err);
        setLoading(false);
      }
    );
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- constraints are typically static
  }, [collectionName]);

  const add = async (item: Omit<T, "id">) => {
    return await addDoc(collection(db, collectionName), {
      ...item,
      createdAt: serverTimestamp(),
    });
  };

  const update = async (id: string, item: Partial<T>) => {
    return await updateDoc(doc(db, collectionName, id), {
      ...item,
      updatedAt: serverTimestamp(),
    });
  };

  const remove = async (id: string) => {
    return await deleteDoc(doc(db, collectionName, id));
  };

  return { data, loading, error, add, update, remove };
}
