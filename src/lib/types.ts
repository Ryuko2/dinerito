export type Person = 'boyfriend' | 'girlfriend';

export const PERSON_NAMES: Record<Person, string> = {
  boyfriend: 'Kevin',
  girlfriend: 'Ángeles',
};

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

export interface CardOption {
  value: string;
  label: string;
  color: string;
}

export const CARDS: CardOption[] = [
  { value: 'efectivo', label: 'Efectivo 💵', color: 'hsl(145, 50%, 42%)' },
  { value: 'santander', label: 'Santander', color: 'hsl(0, 80%, 45%)' },
  { value: 'bbva', label: 'BBVA', color: 'hsl(210, 80%, 40%)' },
  { value: 'amex', label: 'American Express', color: 'hsl(210, 30%, 45%)' },
  { value: 'banamex', label: 'Citibanamex', color: 'hsl(210, 90%, 45%)' },
  { value: 'banorte', label: 'Banorte', color: 'hsl(15, 85%, 48%)' },
  { value: 'hsbc', label: 'HSBC', color: 'hsl(0, 75%, 45%)' },
  { value: 'nu', label: 'Nu', color: 'hsl(275, 70%, 50%)' },
  { value: 'transferencia', label: 'Transferencia', color: 'hsl(200, 40%, 55%)' },
];
