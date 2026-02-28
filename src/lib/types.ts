export type Person = 'boyfriend' | 'girlfriend';

export const PERSON_NAMES: Record<Person, string> = {
  boyfriend: 'Kevin',
  girlfriend: 'Angeles',
};

export type PaymentType = 'credito' | 'debito' | '';

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
  paymentType?: PaymentType;
  thirdPartyName?: string;
}

export interface Income {
  id: string;
  amount: number;
  description: string;
  person: Person;
  date: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  name: string;
  category: string;
  person: Person | 'all';
  limitAmount: number;
  period: 'weekly' | 'biweekly' | 'monthly';
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
  'Hogar', 'Educacion', 'Regalos', 'Suscripciones', 'Otro'
] as const;

export const CATEGORY_ICONS: Record<string, string> = {
  'Comida': 'UtensilsCrossed',
  'Transporte': 'Car',
  'Entretenimiento': 'Film',
  'Ropa': 'ShoppingBag',
  'Salud': 'Heart',
  'Hogar': 'Home',
  'Educacion': 'GraduationCap',
  'Regalos': 'Gift',
  'Suscripciones': 'Repeat',
  'Otro': 'MoreHorizontal',
};

export interface CardOption {
  value: string;
  label: string;
  color: string;
}

export const CARDS: CardOption[] = [
  { value: 'efectivo', label: 'Efectivo', color: 'hsl(145, 50%, 42%)' },
  { value: 'santander', label: 'Santander', color: 'hsl(0, 80%, 45%)' },
  { value: 'bbva', label: 'BBVA', color: 'hsl(210, 80%, 40%)' },
  { value: 'amex', label: 'American Express', color: 'hsl(210, 30%, 45%)' },
  { value: 'banamex', label: 'Citibanamex', color: 'hsl(210, 90%, 45%)' },
  { value: 'banorte', label: 'Banorte', color: 'hsl(15, 85%, 48%)' },
  { value: 'transferencia', label: 'Transferencia', color: 'hsl(200, 40%, 55%)' },
];

export const GOAL_ICONS = [
  'Car', 'Home', 'Plane', 'Laptop', 'Smartphone', 'GraduationCap', 'Gem', 'Guitar', 'Palmtree', 'Target'
] as const;

export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  amountPaid: number;
  person: Person | 'all';
  dueDate?: string;
  notes?: string;
  createdAt: string;
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  person: Person | 'all';
  frequency: RecurrenceFrequency;
  startDate: string;
  active: boolean;
  createdAt: string;
}
