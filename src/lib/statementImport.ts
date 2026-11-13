/**
 * Statement import format — "sheriff-statement-import" v1.0
 * =========================================================
 * Canonical JSON intake for expenses produced OUTSIDE the app (e.g. by Ryuko
 * from a bank statement PDF/CSV Kevin shares with her). The in-app PDF parser
 * (statementParser.ts) is the other producer; both feed the same review queue
 * in StatementImporter.tsx and commit through the same write path.
 *
 * Format spec: ~/workspace/goals/expense-tracking/files/statement-import-format.md
 *
 * Dedupe contract:
 * - Every imported expense carries a `dedupeKey` in Firestore.
 * - Key = SHA-256 hex of the canonical string:
 *     v1|{date}|{amount.toFixed(2)}|{normalizedDescription}|{card}|{paidBy}
 *   where normalizedDescription = trim, collapse internal whitespace to one
 *   space, lowercase. Producers (Python/TS) MUST build the same string.
 * - A producer may supply its own `dedupeKey` per row (e.g. a bank statement
 *   line id); the app then treats it as opaque and never recomputes it.
 */

import { CATEGORIES, CARDS, type Expense, type Person, type PaymentType } from './types';

export const IMPORT_FORMAT = 'sheriff-statement-import';
export const IMPORT_VERSION = '1.0';
/** Spec §2: MSI installments are integers with 1 ≤ current ≤ total ≤ 60. */
export const MSI_MAX_TOTAL = 60;

export interface ImportSource {
  bank: string;
  statementId?: string;
  periodStart?: string;
  periodEnd?: string;
  producedBy?: string;
}

export interface ImportRow {
  date: string;
  description: string;
  amount: number;
  category: string;
  card: string;
  brand: string;
  paidBy: Person;
  paymentType: PaymentType;
  thirdPartyName: string;
  dedupeKey?: string;
  msiCurrent?: number;
  msiTotal?: number;
  /** Producer-side note (e.g. why human input is needed). Shown in the review queue. */
  note?: string;
}

export interface ValidatedImport {
  source: ImportSource;
  /** Batch id written to Firestore as `importBatch` on every committed row. */
  batch: string;
  rows: ImportRow[];
  /** Human-readable problems; rows with errors are excluded from `rows`. */
  errors: string[];
}

const CARD_VALUES = new Set(CARDS.map(c => c.value));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeDescriptionForKey(description: string): string {
  return description.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function canonicalDedupeString(row: {
  date: string; amount: number; description: string; card: string; paidBy: string;
}): string {
  return `v1|${row.date}|${row.amount.toFixed(2)}|${normalizeDescriptionForKey(row.description)}|${row.card}|${row.paidBy}`;
}

export async function computeDedupeKey(row: {
  date: string; amount: number; description: string; card: string; paidBy: string;
}): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalDedupeString(row));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function isRealDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().split('T')[0] === s;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export type ImportValidation = ValidatedImport | { fatal: string };

/**
 * Validate an unknown parsed-JSON value as a statement import file.
 * Envelope problems are fatal (`{ fatal }`); row-level problems exclude
 * only that row and are reported in `errors`.
 */
export function validateImportFile(data: unknown): ImportValidation {
  const root = asRecord(data);
  if (!root) return { fatal: 'El archivo no contiene un objeto JSON válido.' };
  if (root.format !== IMPORT_FORMAT) {
    return { fatal: `Formato no reconocido: se esperaba "${IMPORT_FORMAT}". ¿Es un archivo de importación del Sheriff?` };
  }
  if (root.version !== IMPORT_VERSION) {
    return { fatal: `Versión de formato no soportada: ${String(root.version)} (esta app lee ${IMPORT_VERSION}).` };
  }

  const sourceRaw = asRecord(root.source);
  if (!sourceRaw || typeof sourceRaw.bank !== 'string' || !CARD_VALUES.has(sourceRaw.bank)) {
    return { fatal: 'Falta el banco de origen (source.bank) o no es una tarjeta conocida.' };
  }
  if (!Array.isArray(root.expenses)) return { fatal: 'El archivo no trae la lista "expenses".' };

  const source: ImportSource = {
    bank: sourceRaw.bank,
    statementId: typeof sourceRaw.statementId === 'string' ? sourceRaw.statementId : undefined,
    periodStart: typeof sourceRaw.periodStart === 'string' ? sourceRaw.periodStart : undefined,
    periodEnd: typeof sourceRaw.periodEnd === 'string' ? sourceRaw.periodEnd : undefined,
    producedBy: typeof sourceRaw.producedBy === 'string' ? sourceRaw.producedBy : undefined,
  };
  const batch = source.statementId
    || `${source.bank}-${source.periodEnd || source.periodStart || 'sin-fecha'}`;

  const errors: string[] = [];
  const rows: ImportRow[] = [];

  root.expenses.forEach((rawRow, i) => {
    const at = `Fila ${i + 1}`;
    const r = asRecord(rawRow);
    if (!r) { errors.push(`${at}: no es un objeto`); return; }

    const date = typeof r.date === 'string' ? r.date : '';
    if (!isRealDate(date)) { errors.push(`${at}: fecha inválida (${String(r.date)})`); return; }

    const amount = typeof r.amount === 'number' ? r.amount : Number(r.amount);
    if (!Number.isFinite(amount) || amount <= 0) { errors.push(`${at}: monto inválido (${String(r.amount)})`); return; }

    const category = typeof r.category === 'string' ? r.category : '';
    if (!(CATEGORIES as readonly string[]).includes(category)) {
      errors.push(`${at}: categoría desconocida "${category}" — no se adivina, se excluye`);
      return;
    }

    const card = typeof r.card === 'string' ? r.card : source.bank;
    if (!CARD_VALUES.has(card)) { errors.push(`${at}: tarjeta desconocida "${card}"`); return; }

    const paidBy: Person = r.paidBy === 'girlfriend' ? 'girlfriend' : 'boyfriend';
    const paymentType: PaymentType =
      r.paymentType === 'debito' ? 'debito' : r.paymentType === 'credito' ? 'credito' : '';

    let msiCurrent: number | undefined;
    let msiTotal: number | undefined;
    const msi = asRecord(r.msi);
    if (msi) {
      const cur = Number(msi.current);
      const tot = Number(msi.total);
      if (Number.isInteger(cur) && Number.isInteger(tot) && cur >= 1 && tot >= cur && tot <= MSI_MAX_TOTAL) {
        msiCurrent = cur;
        msiTotal = tot;
      } else {
        errors.push(`${at}: datos MSI inválidos — la fila entra SIN MSI para que Kevin lo confirme`);
      }
    }

    rows.push({
      date,
      description: typeof r.description === 'string' ? r.description.trim() : '',
      amount: Math.round(amount * 100) / 100,
      category,
      card,
      brand: typeof r.brand === 'string' ? r.brand : '',
      paidBy,
      paymentType,
      thirdPartyName: typeof r.thirdPartyName === 'string' ? r.thirdPartyName : '',
      dedupeKey: typeof r.dedupeKey === 'string' && r.dedupeKey ? r.dedupeKey : undefined,
      msiCurrent,
      msiTotal,
      note: typeof r.note === 'string' && r.note ? r.note : undefined,
    });
  });

  return { source, batch, rows, errors };
}

export type DuplicateKind = 'duplicate-db' | 'duplicate-file' | 'possible-duplicate';

/**
 * Classify rows against existing Firestore expenses and against each other.
 * - duplicate-db: dedupeKey already stored on an existing expense.
 * - possible-duplicate: no key match, but same date + amount + normalized
 *   description as an existing expense (e.g. typed in by hand earlier).
 * - duplicate-file: same dedupeKey as an earlier row in this same file.
 * `keys` are the effective dedupe key per row (producer-supplied or computed).
 */
export function analyzeDuplicates(
  keys: string[],
  rows: ImportRow[],
  existing: Pick<Expense, 'dedupeKey' | 'date' | 'amount' | 'description'>[],
): Map<number, DuplicateKind> {
  const result = new Map<number, DuplicateKind>();
  const dbKeys = new Set(existing.map(e => e.dedupeKey).filter(Boolean));
  const dbFuzzy = new Set(
    existing.map(e => `${e.date}|${e.amount.toFixed(2)}|${normalizeDescriptionForKey(e.description)}`),
  );
  const seenInFile = new Set<string>();

  rows.forEach((row, i) => {
    const key = keys[i];
    if (key && dbKeys.has(key)) result.set(i, 'duplicate-db');
    else if (key && seenInFile.has(key)) result.set(i, 'duplicate-file');
    else if (dbFuzzy.has(`${row.date}|${row.amount.toFixed(2)}|${normalizeDescriptionForKey(row.description)}`)) {
      result.set(i, 'possible-duplicate');
    }
    if (key) seenInFile.add(key);
  });

  return result;
}

/**
 * Best-effort MSI (meses sin intereses) detection in a raw statement line.
 * Returns installment numbers when the line carries them ("11 de 12"),
 * 'unknown' when MSI is mentioned without numbers, null when no signal.
 * Detection only FLAGS the row for Kevin — it never decides for him.
 */
export function detectMsi(description: string): { current: number; total: number } | 'unknown' | null {
  const d = description.toLowerCase();
  const numbered = d.match(/(\d{1,2})\s*(?:de|\/)\s*(\d{1,2})\s*(?:meses|msi)?/);
  const mentionsMsi = /meses\s+sin\s+intereses|\bmsi\b/.test(d);
  if (numbered) {
    const cur = parseInt(numbered[1], 10);
    const tot = parseInt(numbered[2], 10);
    if (cur >= 1 && tot >= cur && tot <= MSI_MAX_TOTAL && (mentionsMsi || tot >= 3)) {
      return { current: cur, total: tot };
    }
  }
  return mentionsMsi ? 'unknown' : null;
}
