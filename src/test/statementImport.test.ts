import { describe, it, expect } from 'vitest';
import {
  validateImportFile,
  computeDedupeKey,
  canonicalDedupeString,
  analyzeDuplicates,
  detectMsi,
  type ImportRow,
} from '@/lib/statementImport';
import { normalizeExpense } from '@/lib/migrateFirestore';

const row = (patch: Partial<ImportRow> = {}): ImportRow => ({
  date: '2026-04-12',
  description: 'MERCADO LIBRE MEXICO',
  amount: 662.59,
  category: 'Otro',
  card: 'amex',
  brand: '',
  paidBy: 'boyfriend',
  paymentType: 'credito',
  thirdPartyName: '',
  ...patch,
});

const file = (expenses: unknown[], source: Record<string, unknown> = { bank: 'amex', statementId: 'amex-2026-04' }) => ({
  format: 'sheriff-statement-import',
  version: '1.0',
  source,
  expenses,
});

describe('validateImportFile', () => {
  it('accepts a well-formed file and derives the batch from statementId', () => {
    const v = validateImportFile(file([{ date: '2026-04-12', description: 'UBER', amount: 120, category: 'Transporte', card: 'amex', paidBy: 'boyfriend' }]));
    if ('fatal' in v) throw new Error(v.fatal);
    expect(v.batch).toBe('amex-2026-04');
    expect(v.rows).toHaveLength(1);
    expect(v.rows[0].brand).toBe('');
    expect(v.errors).toEqual([]);
  });

  it('rejects a wrong envelope as fatal', () => {
    const v = validateImportFile({ format: 'something-else', version: '1.0', source: { bank: 'amex' }, expenses: [] });
    expect('fatal' in v).toBe(true);
  });

  it('excludes a row with an unknown category instead of guessing', () => {
    const v = validateImportFile(file([
      { date: '2026-04-12', description: 'X', amount: 10, category: 'Viajes', card: 'amex' },
      { date: '2026-04-12', description: 'Y', amount: 20, category: 'Comida', card: 'amex' },
    ]));
    if ('fatal' in v) throw new Error(v.fatal);
    expect(v.rows).toHaveLength(1);
    expect(v.rows[0].description).toBe('Y');
    expect(v.errors[0]).toContain('categoría desconocida');
  });

  it('excludes rows with invalid dates or amounts', () => {
    const v = validateImportFile(file([
      { date: '2026-02-30', description: 'X', amount: 10, category: 'Comida', card: 'amex' },
      { date: '2026-04-12', description: 'X', amount: 0, category: 'Comida', card: 'amex' },
      { date: '2026-04-12', description: 'X', amount: -5, category: 'Comida', card: 'amex' },
    ]));
    if ('fatal' in v) throw new Error(v.fatal);
    expect(v.rows).toHaveLength(0);
    expect(v.errors).toHaveLength(3);
  });

  it('keeps valid MSI data and strips invalid MSI with an error note', () => {
    const v = validateImportFile(file([
      { date: '2026-04-12', description: 'A', amount: 100, category: 'Otro', card: 'amex', msi: { current: 11, total: 12 } },
      { date: '2026-04-12', description: 'B', amount: 100, category: 'Otro', card: 'amex', msi: { current: 13, total: 12 } },
    ]));
    if ('fatal' in v) throw new Error(v.fatal);
    expect(v.rows[0].msiCurrent).toBe(11);
    expect(v.rows[0].msiTotal).toBe(12);
    expect(v.rows[1].msiCurrent).toBeUndefined();
    expect(v.errors.some(e => e.includes('MSI'))).toBe(true);
  });

  it('strips MSI totals above the spec ceiling of 60, keeps 60 itself (EVE-016)', () => {
    const v = validateImportFile(file([
      { date: '2026-04-12', description: 'A', amount: 100, category: 'Otro', card: 'amex', msi: { current: 1, total: 61 } },
      { date: '2026-04-12', description: 'B', amount: 100, category: 'Otro', card: 'amex', msi: { current: 5, total: 60 } },
    ]));
    if ('fatal' in v) throw new Error(v.fatal);
    expect(v.rows).toHaveLength(2); // rows still enter; only the bad MSI is dropped
    expect(v.rows[0].msiCurrent).toBeUndefined();
    expect(v.rows[0].msiTotal).toBeUndefined();
    expect(v.rows[1].msiCurrent).toBe(5);
    expect(v.rows[1].msiTotal).toBe(60);
    expect(v.errors.some(e => e.includes('MSI'))).toBe(true);
  });
});

describe('normalizeExpense MSI pair (EVE-016)', () => {
  const base = {
    amount: 100, description: 'X', category: 'Otro', card: 'amex',
    paidBy: 'boyfriend', date: '2026-04-12',
  };

  it('keeps a valid pair', () => {
    const e = normalizeExpense({ ...base, msiCurrent: 3, msiTotal: 12 }, 'id1');
    expect(e.msiCurrent).toBe(3);
    expect(e.msiTotal).toBe(12);
  });

  it('drops a pair whose total exceeds the 60 ceiling', () => {
    const e = normalizeExpense({ ...base, msiCurrent: 1, msiTotal: 61 }, 'id1');
    expect(e.msiCurrent).toBeUndefined();
    expect(e.msiTotal).toBeUndefined();
  });

  it('drops a half pair (current without total)', () => {
    const e = normalizeExpense({ ...base, msiCurrent: 3 }, 'id1');
    expect(e.msiCurrent).toBeUndefined();
    expect(e.msiTotal).toBeUndefined();
  });

  it('drops a pair where current exceeds total', () => {
    const e = normalizeExpense({ ...base, msiCurrent: 13, msiTotal: 12 }, 'id1');
    expect(e.msiCurrent).toBeUndefined();
    expect(e.msiTotal).toBeUndefined();
  });
});

describe('computeDedupeKey', () => {
  it('matches the cross-language known-answer vector (Python hashlib)', async () => {
    const key = await computeDedupeKey({
      date: '2026-04-12', amount: 662.59,
      description: 'MERCADO LIBRE MEXICO', card: 'amex', paidBy: 'boyfriend',
    });
    expect(key).toBe('89229522ecc27120bcec0ead212f10d710e8748aec0b24d0d920813de636c685');
  });

  it('is insensitive to description case and extra whitespace', () => {
    const a = canonicalDedupeString({ date: '2026-04-12', amount: 662.59, description: '  Mercado   Libre Mexico ', card: 'amex', paidBy: 'boyfriend' });
    const b = canonicalDedupeString({ date: '2026-04-12', amount: 662.59, description: 'mercado libre mexico', card: 'amex', paidBy: 'boyfriend' });
    expect(a).toBe(b);
  });

  it('changes when amount, date or person changes', async () => {
    const base = { date: '2026-04-12', amount: 662.59, description: 'X', card: 'amex', paidBy: 'boyfriend' as const };
    const k = await computeDedupeKey(base);
    expect(await computeDedupeKey({ ...base, amount: 662.6 })).not.toBe(k);
    expect(await computeDedupeKey({ ...base, date: '2026-04-13' })).not.toBe(k);
    expect(await computeDedupeKey({ ...base, paidBy: 'girlfriend' })).not.toBe(k);
  });
});

describe('analyzeDuplicates', () => {
  it('flags a key already in Firestore as duplicate-db', async () => {
    const r = row();
    const key = await computeDedupeKey(r);
    const res = analyzeDuplicates([key], [r], [{ dedupeKey: key, date: r.date, amount: r.amount, description: r.description }]);
    expect(res.get(0)).toBe('duplicate-db');
  });

  it('flags a hand-typed lookalike as possible-duplicate', () => {
    const r = row();
    const res = analyzeDuplicates(['somekey'], [r], [{ date: r.date, amount: r.amount, description: 'mercado libre mexico' }]);
    expect(res.get(0)).toBe('possible-duplicate');
  });

  it('flags the second occurrence inside the same file', () => {
    const res = analyzeDuplicates(['k', 'k'], [row(), row()], []);
    expect(res.get(0)).toBeUndefined();
    expect(res.get(1)).toBe('duplicate-file');
  });

  it('leaves genuinely new rows unflagged', () => {
    const res = analyzeDuplicates(['k'], [row()], [{ date: '2025-01-01', amount: 1, description: 'other' }]);
    expect(res.size).toBe(0);
  });
});

describe('detectMsi', () => {
  it('reads numbered installments', () => {
    expect(detectMsi('COMPRA TIENDA 11 DE 12')).toEqual({ current: 11, total: 12 });
    expect(detectMsi('LIVERPOOL MSI 03/06')).toEqual({ current: 3, total: 6 });
  });

  it('returns unknown when MSI is mentioned without numbers', () => {
    expect(detectMsi('PAGO A MESES SIN INTERESES')).toBe('unknown');
  });

  it('returns null for ordinary charges', () => {
    expect(detectMsi('UBER *TRIP')).toBeNull();
    expect(detectMsi('OXXO GAS')).toBeNull();
  });
});
