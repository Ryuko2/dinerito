/**
 * Normalizes Firestore documents to match the current app schema.
 * Handles old data structures and missing fields gracefully.
 * DO NOT delete old data - only add defaults for missing fields.
 */
import type { Expense, SavingsGoal, Income, Budget } from "./types";

const CATEGORIES = ["Comida", "Transporte", "Entretenimiento", "Ropa", "Salud", "Hogar", "Educacion", "Regalos", "Suscripciones", "Otro"] as const;
const GOAL_ICONS = ["Car", "Home", "Plane", "Laptop", "Smartphone", "GraduationCap", "Gem", "Guitar", "Palmtree", "Target"] as const;

function toDateString(v: unknown): string {
  if (!v) return new Date().toISOString().split("T")[0];
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate().toISOString?.()?.split?.("T")?.[0] ?? new Date().toISOString().split("T")[0];
  }
  return new Date().toISOString().split("T")[0];
}

function toIsoString(v: unknown): string {
  if (!v) return new Date().toISOString();
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate().toISOString?.() ?? new Date().toISOString();
  }
  return new Date().toISOString();
}

export function normalizeExpense(raw: Record<string, unknown>, id: string): Expense {
  const paidBy = raw.paidBy === "girlfriend" ? "girlfriend" : "boyfriend";
  const category = typeof raw.category === "string" && CATEGORIES.includes(raw.category as typeof CATEGORIES[number])
    ? raw.category
    : "Otro";
  // Support old field names: monto->amount, fecha->date, descripcion->description
  const amountVal = raw.amount ?? raw.monto;
  const dateVal = raw.date ?? raw.fecha;
  const descVal = raw.description ?? raw.descripcion;
  return {
    id,
    amount: typeof amountVal === "number" ? amountVal : Number(amountVal) || 0,
    description: typeof descVal === "string" ? descVal : String(descVal ?? ""),
    category,
    card: typeof raw.card === "string" ? raw.card : "efectivo",
    brand: typeof raw.brand === "string" ? raw.brand : "",
    paidBy,
    date: toDateString(dateVal),
    createdAt: toIsoString(raw.createdAt),
    paymentType: raw.paymentType === "credito" || raw.paymentType === "debito" ? raw.paymentType : undefined,
    thirdPartyName: typeof raw.thirdPartyName === "string" && raw.thirdPartyName ? raw.thirdPartyName : undefined,
  };
}

export function normalizeGoal(raw: Record<string, unknown>, id: string): SavingsGoal {
  const icon = typeof raw.icon === "string" && (GOAL_ICONS as readonly string[]).includes(raw.icon) ? raw.icon : "Target";
  const targetVal = raw.targetAmount ?? raw.target;
  const currentVal = raw.currentAmount ?? raw.current;
  return {
    id,
    name: typeof raw.name === "string" ? raw.name : String(raw.name ?? ""),
    targetAmount: typeof targetVal === "number" ? targetVal : Number(targetVal) || 0,
    currentAmount: typeof currentVal === "number" ? currentVal : Number(currentVal) || 0,
    icon,
    createdAt: toIsoString(raw.createdAt),
  };
}

export function normalizeIncome(raw: Record<string, unknown>, id: string): Income {
  const person = raw.person === "girlfriend" ? "girlfriend" : "boyfriend";
  const amountVal = raw.amount ?? raw.monto;
  const dateVal = raw.date ?? raw.fecha;
  const descVal = raw.description ?? raw.descripcion;
  return {
    id,
    amount: typeof amountVal === "number" ? amountVal : Number(amountVal) || 0,
    description: typeof descVal === "string" ? descVal : String(descVal ?? ""),
    person,
    date: toDateString(dateVal),
    createdAt: toIsoString(raw.createdAt),
  };
}

export function normalizeBudget(raw: Record<string, unknown>, id: string): Budget {
  const person = raw.person === "girlfriend" ? "girlfriend" : raw.person === "boyfriend" ? "boyfriend" : "all";
  const period = raw.period === "weekly" || raw.period === "biweekly" ? raw.period : "monthly";
  const category = typeof raw.category === "string" ? raw.category : "all";
  return {
    id,
    name: typeof raw.name === "string" ? raw.name : String(raw.name ?? ""),
    category,
    person,
    limitAmount: typeof raw.limitAmount === "number" ? raw.limitAmount : Number(raw.limitAmount) || 0,
    period,
    createdAt: toIsoString(raw.createdAt),
  };
}

export function normalizeDocument(
  collectionName: string,
  raw: Record<string, unknown>,
  id: string
): Record<string, unknown> {
  switch (collectionName) {
    case "expenses":
      return normalizeExpense(raw, id) as unknown as Record<string, unknown>;
    case "goals":
      return normalizeGoal(raw, id) as unknown as Record<string, unknown>;
    case "incomes":
      return normalizeIncome(raw, id) as unknown as Record<string, unknown>;
    case "budgets":
      return normalizeBudget(raw, id) as unknown as Record<string, unknown>;
    default:
      return { ...raw, id };
  }
}
