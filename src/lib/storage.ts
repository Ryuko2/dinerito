import { Expense, SavingsGoal } from './types';

const EXPENSES_KEY = 'sheriff-expenses';
const GOALS_KEY = 'sheriff-goals';

export function getExpenses(): Expense[] {
  const data = localStorage.getItem(EXPENSES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveExpense(expense: Expense): void {
  const expenses = getExpenses();
  expenses.push(expense);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

export function deleteExpense(id: string): void {
  const expenses = getExpenses().filter(e => e.id !== id);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

export function getGoals(): SavingsGoal[] {
  const data = localStorage.getItem(GOALS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveGoal(goal: SavingsGoal): void {
  const goals = getGoals();
  goals.push(goal);
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

export function updateGoal(id: string, updates: Partial<SavingsGoal>): void {
  const goals = getGoals().map(g => g.id === id ? { ...g, ...updates } : g);
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

export function deleteGoal(id: string): void {
  const goals = getGoals().filter(g => g.id !== id);
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}
