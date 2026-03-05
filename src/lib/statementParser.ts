/**
 * Regex-based bank statement parser for Mexican banks.
 * Zero AI cost — extracts text via pdfjs, parses with bank-specific regex.
 */

import { CATEGORIES } from './types';

export type BankKey = 'bbva' | 'santander' | 'banamex' | 'banorte' | 'amex' | 'generic';

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  card: string;
  brand: string;
  paymentType: 'credito' | 'debito';
  isCharge: boolean;
}

export interface ParseResult {
  expenses: ParsedTransaction[];
  unparsedLines: string[];
  detectedBank: BankKey;
}

// ─── PDF Text Extraction (pdfjs-dist v5 ESM) ────────────────────

export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs' as any);

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;

  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    type TextItem = { str: string; transform: number[] };
    const items = (content.items as TextItem[]).filter(item => item.str.trim().length > 0);

    items.sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5];
      if (Math.abs(yDiff) > 3) return yDiff;
      return a.transform[4] - b.transform[4];
    });

    const lineGroups: { y: number; parts: string[] }[] = [];
    for (const item of items) {
      const y = Math.round(item.transform[5]);
      const last = lineGroups[lineGroups.length - 1];
      if (last && Math.abs(last.y - y) < 5) {
        last.parts.push(item.str);
      } else {
        lineGroups.push({ y, parts: [item.str] });
      }
    }

    pageTexts.push(lineGroups.map(g => g.parts.join('  ')).join('\n'));
  }

  return pageTexts.join('\n');
}

// ─── Bank Detection ──────────────────────────────────────────────

export function detectBank(text: string): BankKey {
  const t = text.toLowerCase();
  if (t.includes('bbva') || t.includes('bancomer')) return 'bbva';
  if (t.includes('santander')) return 'santander';
  if (t.includes('banamex') || t.includes('citibanamex') || t.includes('citi')) return 'banamex';
  if (t.includes('banorte')) return 'banorte';
  if (t.includes('amex') || t.includes('american express')) return 'amex';
  return 'generic';
}

// ─── Skip Patterns (not charges) ─────────────────────────────────

const SKIP_PATTERNS = /pago\s*(total|mínimo)?|abono|depósito|deposito|saldo\s*anterior|interes|interés|anualidad|comisión por|comision por|iva\s*por\s*intereses|crédito\s*a\s*cuenta|devolución|devolucion/i;

function shouldSkip(line: string): boolean {
  return SKIP_PATTERNS.test(line) || /^\s*$/.test(line);
}

// ─── Amount Parsing ───────────────────────────────────────────────

function parseAmount(s: string): number | null {
  const cleaned = s.replace(/\$/g, '').replace(/,/g, '').replace(/\s/g, '').trim();
  const m = cleaned.match(/^(\d+\.?\d*)$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return isNaN(n) ? null : Math.abs(n);
}

// ─── Date Normalization (to YYYY-MM-DD) ──────────────────────────

function normalizeDate(d: string, fallbackYear?: number): string {
  const now = new Date();
  const year = fallbackYear ?? now.getFullYear();

  // DD/MM/YYYY or DD/MM/YY
  let m = d.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.]?(\d{2,4})?$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const y = m[3] ? (parseInt(m[3], 10) < 100 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10)) : year;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // DD MMM (e.g. 15 ENE)
  const months: Record<string, number> = {
    ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
    jul: 7, ago: 8, sep: 9, oct: 10, nov: 11, dic: 12,
  };
  m = d.match(/^(\d{1,2})\s+(\w{3})$/i);
  if (m) {
    const mon = months[m[2].toLowerCase().slice(0, 3)];
    if (mon) {
      const day = parseInt(m[1], 10);
      return `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ─── Category Guessing ─────────────────────────────────────────────

export function guessCategory(description: string): string {
  const d = description.toLowerCase();
  const cats: { keywords: string[]; cat: string }[] = [
    { keywords: ['uber', 'didi', 'taxi', 'gasolina', 'shell', 'mobil', 'pemex', 'estacionamiento', 'caseta'], cat: 'Transporte' },
    { keywords: ['oxxo', '7eleven', 'super', 'soriana', 'chedraui', 'bodega', 'walmart', 'costco', 'heb', 'city market'], cat: 'Hogar' },
    { keywords: ['restaurant', 'restaurante', 'cafe', 'café', 'starbucks', 'dominós', 'dominos', 'pizza', 'rappiburger', 'uber eats', 'rappi'], cat: 'Comida' },
    { keywords: ['netflix', 'spotify', 'disney', 'hbo', 'youtube premium', 'amazon prime', 'apple music'], cat: 'Suscripciones' },
    { keywords: ['farmacia', 'similares', 'femsa', 'hospital', 'gym', 'dental'], cat: 'Salud' },
    { keywords: ['amazon', 'mercadolibre', 'linio', 'shein', 'zara', 'h&m', 'ropa'], cat: 'Ropa' },
    { keywords: ['cine', 'theatre', 'teatro', 'bolera', 'arcade'], cat: 'Entretenimiento' },
    { keywords: ['universidad', 'curso', 'udemy', 'coursera', 'libro'], cat: 'Educacion' },
    { keywords: ['florería', 'floreria', 'regalo', 'gift'], cat: 'Regalos' },
  ];
  for (const { keywords, cat } of cats) {
    if (keywords.some(k => d.includes(k))) return cat;
  }
  return 'Otro';
}

// ─── Bank-Specific Parsers ───────────────────────────────────────

function parseBBVA(lines: string[], year: number): { parsed: ParsedTransaction[]; unparsed: string[] } {
  const parsed: ParsedTransaction[] = [];
  const unparsed: string[] = [];
  const chargePattern = /^(\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?)\s+(.+?)\s+([\d,]+\.?\d{0,2})\s*$/;
  const altPattern = /^(.+?)\s+\$?\s*([\d,]+\.?\d{0,2})\s*$/;

  for (const line of lines) {
    if (shouldSkip(line)) continue;
    const trimmed = line.trim();
    let m = trimmed.match(chargePattern);
    if (m) {
      const amount = parseAmount(m[3]);
      if (amount && amount > 0) {
        parsed.push({
          date: normalizeDate(m[1], year),
          description: m[2].trim().slice(0, 120),
          amount,
          category: guessCategory(m[2]),
          card: 'bbva',
          brand: '',
          paymentType: 'credito',
          isCharge: true,
        });
        continue;
      }
    }
    m = trimmed.match(altPattern);
    if (m && m[1].length > 3) {
      const amount = parseAmount(m[2]);
      if (amount && amount > 0 && amount < 1000000) {
        parsed.push({
          date: normalizeDate('', year),
          description: m[1].trim().slice(0, 120),
          amount,
          category: guessCategory(m[1]),
          card: 'bbva',
          brand: '',
          paymentType: 'credito',
          isCharge: true,
        });
        continue;
      }
    }
    if (/[\d,]+\.?\d{0,2}\s*$/.test(trimmed) && trimmed.length > 10) unparsed.push(trimmed);
  }
  return { parsed, unparsed };
}

function parseSantander(lines: string[], year: number): { parsed: ParsedTransaction[]; unparsed: string[] } {
  const parsed: ParsedTransaction[] = [];
  const unparsed: string[] = [];
  const pattern = /^(\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?)\s+(.+?)\s+[\$]?\s*([\d,]+\.?\d{0,2})\s*$/;

  for (const line of lines) {
    if (shouldSkip(line)) continue;
    const trimmed = line.trim();
    const m = trimmed.match(pattern);
    if (m) {
      const amount = parseAmount(m[3]);
      if (amount && amount > 0) {
        parsed.push({
          date: normalizeDate(m[1], year),
          description: m[2].trim().slice(0, 120),
          amount,
          category: guessCategory(m[2]),
          card: 'santander',
          brand: '',
          paymentType: 'credito',
          isCharge: true,
        });
        continue;
      }
    }
    if (/[\d,]+\.?\d{0,2}\s*$/.test(trimmed) && trimmed.length > 10) unparsed.push(trimmed);
  }
  return { parsed, unparsed };
}

function parseBanamex(lines: string[], year: number): { parsed: ParsedTransaction[]; unparsed: string[] } {
  const parsed: ParsedTransaction[] = [];
  const unparsed: string[] = [];
  const pattern1 = /^(\d{1,2}\s+(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic))\.?\s+(.+?)\s+[\$]?\s*([\d,]+\.?\d{0,2})\s*$/i;
  const pattern2 = /^(\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?)\s+(.+?)\s+[\$]?\s*([\d,]+\.?\d{0,2})\s*$/;

  for (const line of lines) {
    if (shouldSkip(line)) continue;
    const trimmed = line.trim();
    let m = trimmed.match(pattern1);
    if (!m) m = trimmed.match(pattern2);
    if (m) {
      const amount = parseAmount(m[3]);
      if (amount && amount > 0) {
        parsed.push({
          date: normalizeDate(m[1], year),
          description: m[2].trim().slice(0, 120),
          amount,
          category: guessCategory(m[2]),
          card: 'banamex',
          brand: '',
          paymentType: 'credito',
          isCharge: true,
        });
        continue;
      }
    }
    if (/[\d,]+\.?\d{0,2}\s*$/.test(trimmed) && trimmed.length > 10) unparsed.push(trimmed);
  }
  return { parsed, unparsed };
}

function parseBanorte(lines: string[], year: number): { parsed: ParsedTransaction[]; unparsed: string[] } {
  const parsed: ParsedTransaction[] = [];
  const unparsed: string[] = [];
  const pattern = /^(\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?)\s+(.+?)\s+[\$]?\s*([\d,]+\.?\d{0,2})\s*$/;

  for (const line of lines) {
    if (shouldSkip(line)) continue;
    const trimmed = line.trim();
    const m = trimmed.match(pattern);
    if (m) {
      const amount = parseAmount(m[3]);
      if (amount && amount > 0) {
        parsed.push({
          date: normalizeDate(m[1], year),
          description: m[2].trim().slice(0, 120),
          amount,
          category: guessCategory(m[2]),
          card: 'banorte',
          brand: '',
          paymentType: 'credito',
          isCharge: true,
        });
        continue;
      }
    }
    if (/[\d,]+\.?\d{0,2}\s*$/.test(trimmed) && trimmed.length > 10) unparsed.push(trimmed);
  }
  return { parsed, unparsed };
}

function parseAmex(lines: string[], year: number): { parsed: ParsedTransaction[]; unparsed: string[] } {
  const parsed: ParsedTransaction[] = [];
  const unparsed: string[] = [];
  const pattern = /^(\d{1,2}\s+(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic))\.?\s+(.+?)\s+[\$]?\s*([\d,]+\.?\d{0,2})\s*$/i;
  const altPattern = /^(\d{1,2}[\/\-\.]\d{1,2})\s+(.+?)\s+[\$]?\s*([\d,]+\.?\d{0,2})\s*$/;

  for (const line of lines) {
    if (shouldSkip(line)) continue;
    const trimmed = line.trim();
    let m = trimmed.match(pattern);
    if (!m) m = trimmed.match(altPattern);
    if (m) {
      const amount = parseAmount(m[3]);
      if (amount && amount > 0) {
        parsed.push({
          date: normalizeDate(m[1], year),
          description: m[2].trim().slice(0, 120),
          amount,
          category: guessCategory(m[2]),
          card: 'amex',
          brand: '',
          paymentType: 'credito',
          isCharge: true,
        });
        continue;
      }
    }
    if (/[\d,]+\.?\d{0,2}\s*$/.test(trimmed) && trimmed.length > 10) unparsed.push(trimmed);
  }
  return { parsed, unparsed };
}

function parseGeneric(lines: string[], year: number): { parsed: ParsedTransaction[]; unparsed: string[] } {
  const parsed: ParsedTransaction[] = [];
  const unparsed: string[] = [];
  const pattern = /^(.+?)\s+[\$]?\s*([\d,]+\.?\d{0,2})\s*$/;
  const datePrefix = /^(\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?)\s+(.+)$/;

  for (const line of lines) {
    if (shouldSkip(line)) continue;
    const trimmed = line.trim();
    const m = trimmed.match(pattern);
    if (m && m[1].length > 5) {
      const amount = parseAmount(m[2]);
      if (amount && amount > 0 && amount < 500000) {
        let datePart = '';
        let desc = m[1].trim();
        const dp = desc.match(datePrefix);
        if (dp) {
          datePart = dp[1];
          desc = dp[2].trim();
        }
        parsed.push({
          date: normalizeDate(datePart || '', year),
          description: desc.slice(0, 120),
          amount,
          category: guessCategory(desc),
          card: 'transferencia',
          brand: '',
          paymentType: 'credito',
          isCharge: true,
        });
        continue;
      }
    }
    if (/[\d,]+\.?\d{0,2}\s*$/.test(trimmed) && trimmed.length > 10) unparsed.push(trimmed);
  }
  return { parsed, unparsed };
}

// ─── Main Parser ──────────────────────────────────────────────────

export function parseStatement(text: string, bank?: BankKey): ParseResult {
  const detected = bank ?? detectBank(text);
  const year = new Date().getFullYear();
  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);

  let result: { parsed: ParsedTransaction[]; unparsed: string[] };
  switch (detected) {
    case 'bbva': result = parseBBVA(lines, year); break;
    case 'santander': result = parseSantander(lines, year); break;
    case 'banamex': result = parseBanamex(lines, year); break;
    case 'banorte': result = parseBanorte(lines, year); break;
    case 'amex': result = parseAmex(lines, year); break;
    default: result = parseGeneric(lines, year);
  }

  const cardMap: Record<BankKey, string> = {
    bbva: 'bbva', santander: 'santander', banamex: 'banamex',
    banorte: 'banorte', amex: 'amex', generic: 'transferencia',
  };
  const card = cardMap[detected];

  const expenses = result.parsed
    .filter(e => e.isCharge && e.amount > 0)
    .map(e => ({ ...e, card, category: CATEGORIES.includes(e.category as (typeof CATEGORIES)[number]) ? e.category : 'Otro' }));

  return {
    expenses,
    unparsedLines: result.unparsed,
    detectedBank: detected,
  };
}
