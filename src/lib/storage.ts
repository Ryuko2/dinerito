import { Expense, SavingsGoal } from './types';

// ==========================================
// 🔥 FIREBASE-READY STORAGE LAYER
// ==========================================
// Currently uses localStorage. To switch to Firebase:
// 1. Install firebase: npm install firebase
// 2. Create src/lib/firebase.ts with your config
// 3. Replace the implementations below with Firestore calls
// 4. Each function is already async-ready (just add async/await)
//
// Example Firebase replacement for getExpenses():
//   import { collection, getDocs, query, orderBy } from 'firebase/firestore';
//   import { db } from './firebase';
//   export async function getExpenses(): Promise<Expense[]> {
//     const snap = await getDocs(query(collection(db, 'expenses'), orderBy('createdAt', 'desc')));
//     return snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
//   }
// ==========================================

const EXPENSES_KEY = 'sheriff-expenses';
const GOALS_KEY = 'sheriff-goals';

export function getExpenses(): Expense[] {
  const data = localStorage.getItem(EXPENSES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveExpense(expense: Expense): void {
  // Firebase: await addDoc(collection(db, 'expenses'), expense);
  const expenses = getExpenses();
  expenses.push(expense);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

export function deleteExpense(id: string): void {
  // Firebase: await deleteDoc(doc(db, 'expenses', id));
  const expenses = getExpenses().filter(e => e.id !== id);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

export function getGoals(): SavingsGoal[] {
  const data = localStorage.getItem(GOALS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveGoal(goal: SavingsGoal): void {
  // Firebase: await addDoc(collection(db, 'goals'), goal);
  const goals = getGoals();
  goals.push(goal);
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

export function updateGoal(id: string, updates: Partial<SavingsGoal>): void {
  // Firebase: await updateDoc(doc(db, 'goals', id), updates);
  const goals = getGoals().map(g => g.id === id ? { ...g, ...updates } : g);
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

export function deleteGoal(id: string): void {
  // Firebase: await deleteDoc(doc(db, 'goals', id));
  const goals = getGoals().filter(g => g.id !== id);
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}
