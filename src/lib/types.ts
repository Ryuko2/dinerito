export type Person = 'boyfriend' | 'girlfriend';

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  card: string;
  brand: string;
  paidBy: Person;
  date: string;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  icon: string;
  createdAt: string;
}

export const CATEGORIES = [
  'Comida', 'Transporte', 'Entretenimiento', 'Ropa', 'Salud',
  'Hogar', 'Educación', 'Regalos', 'Suscripciones', 'Otro'
] as const;

export const CARDS = [
  'Efectivo', 'Débito', 'Crédito', 'Transferencia'
] as const;
