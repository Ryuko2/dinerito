import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORIES, CARDS, PERSON_NAMES, Person, PaymentType, type Expense } from '@/lib/types';
import CategoryIcon from '@/components/CategoryIcon';
import CardBrandIcon from '@/components/CardBrandIcon';
import { extractTextFromPDF, parseStatement, guessCategory, type BankKey } from '@/lib/statementParser';
import {
  validateImportFile, computeDedupeKey, analyzeDuplicates, detectMsi,
  type DuplicateKind, type ImportRow,
} from '@/lib/statementImport';
import {
  Upload, Loader2, Check, X, AlertTriangle,
  ChevronDown, ChevronUp, Trash2, FileText, FileJson, Plus, Percent,
} from 'lucide-react';
import { toast } from 'sonner';

type RowFlag = DuplicateKind | 'missing-description' | 'msi' | 'msi-unconfirmed' | 'needs-input';

interface ParsedExpense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  card: string;
  brand: string;
  paidBy: Person;
  paymentType: PaymentType;
  /** Name of a third party this expense belongs to (import contract field). */
  thirdPartyName?: string;
  selected: boolean;
  expanded: boolean;
  isManual?: boolean;
  dedupeKey?: string;
  importBatch?: string;
  msiCurrent?: number;
  msiTotal?: number;
  flags: RowFlag[];
  note?: string;
}

type AddExpenseFn = (item: {
  amount: number; description: string; category: string;
  card: string; brand: string; paidBy: Person;
  date: string; paymentType?: PaymentType;
  thirdPartyName?: string;
  dedupeKey?: string; importBatch?: string;
  msiCurrent?: number; msiTotal?: number;
}) => Promise<unknown>;

interface Props {
  onExpenseAdded: AddExpenseFn;
  /** Current Firestore expenses — used to flag duplicates before saving. */
  existingExpenses?: Expense[];
}

type Step = 'upload' | 'parsing' | 'review' | 'saving' | 'done';
type SourceMode = 'pdf' | 'json';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

const todayStr = () => new Date().toISOString().split('T')[0];

/** A row is committable only with a positive amount and a real description.
 *  saveSelected enforces this; the footer counts it too (EVE-017) so the
 *  button never promises rows that save would silently skip. */
const isCommittable = (e: ParsedExpense) => e.amount > 0 && e.description.trim() !== '';

const FLAG_LABELS: Record<RowFlag, string> = {
  'duplicate-db': 'Ya está en el Sheriff',
  'duplicate-file': 'Duplicado en el archivo',
  'possible-duplicate': 'Posible duplicado',
  'missing-description': 'Sin descripción — pregúntale a Kevin',
  'msi': 'MSI',
  'msi-unconfirmed': '¿MSI? Confírmalo',
  'needs-input': 'Revisar',
};

export default function StatementImporter({ onExpenseAdded, existingExpenses = [] }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [mode, setMode] = useState<SourceMode>('pdf');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [defaultPerson, setDefaultPerson] = useState<Person>('boyfriend');
  const [expenses, setExpenses] = useState<ParsedExpense[]>([]);
  const [unparsedLines, setUnparsedLines] = useState<string[]>([]);
  const [detectedBank, setDetectedBank] = useState<BankKey>('generic');
  const [parseError, setParseError] = useState<string | null>(null);
  const [savingCount, setSavingCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [jsonText, setJsonText] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [batchLabel, setBatchLabel] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(0);

  const nextId = () => `p-${++idCounter.current}-${Date.now()}`;

  // ── SHARED REVIEW PIPELINE ────────────────────────────────────
  // Both producers (PDF parser, Ryuko's JSON files) land here: dedupe keys
  // are computed for rows that lack one, duplicates are flagged against
  // Firestore and within the batch, and risky rows start UNSELECTED.

  const loadReviewRows = useCallback(async (
    rows: ImportRow[],
    batch: string | null,
    bank: BankKey,
    unconfirmedMsiIdx: Set<number> = new Set(),
  ) => {
    const keys = await Promise.all(rows.map(r =>
      r.dedupeKey ?? computeDedupeKey(r),
    ));
    const dupes = analyzeDuplicates(keys, rows, existingExpenses);

    const mapped: ParsedExpense[] = rows.map((r, i) => {
      const flags: RowFlag[] = [];
      const dup = dupes.get(i);
      if (dup) flags.push(dup);
      if (!r.description.trim()) flags.push('missing-description');
      if (r.msiCurrent && r.msiTotal) flags.push('msi');
      if (unconfirmedMsiIdx.has(i)) flags.push('msi-unconfirmed');
      if (r.note) flags.push('needs-input');
      const blocked = flags.some(f =>
        f === 'duplicate-db' || f === 'duplicate-file' || f === 'possible-duplicate'
        || f === 'missing-description' || f === 'msi-unconfirmed');
      return {
        id: nextId(),
        date: r.date,
        description: r.description,
        amount: r.amount,
        category: r.category,
        card: r.card,
        brand: r.brand,
        paidBy: r.paidBy,
        paymentType: r.paymentType,
        thirdPartyName: r.thirdPartyName || undefined,
        selected: !blocked,
        expanded: blocked || flags.includes('needs-input'),
        isManual: false,
        dedupeKey: keys[i],
        importBatch: batch ?? undefined,
        msiCurrent: r.msiCurrent,
        msiTotal: r.msiTotal,
        flags,
        note: r.note,
      };
    });

    setExpenses(mapped);
    setDetectedBank(bank);
    setBatchLabel(batch);
    setStep('review');
    const dupCount = mapped.filter(e => e.flags.some(f => f.includes('duplicate'))).length;
    toast.success(
      `✅ ${mapped.length} transacciones listas para revisar`
      + (dupCount > 0 ? ` · ${dupCount} duplicados marcados` : ''),
    );
  }, [existingExpenses]);

  // ── PDF HANDLING ─────────────────────────────────────────────

  const handleFile = useCallback((f: File) => {
    if (f.type !== 'application/pdf') {
      toast.error('Solo se aceptan archivos PDF');
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error('El archivo no puede superar 20MB');
      return;
    }
    setFile(f);
    setParseError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const parsePdf = async () => {
    if (!file) return;
    setStep('parsing');
    setParseError(null);
    setImportErrors([]);

    try {
      const text = await extractTextFromPDF(file);
      if (!text.trim()) {
        setParseError('No se pudo extraer texto del PDF. Verifica que el documento sea válido.');
        setStep('upload');
        return;
      }

      const result = parseStatement(text);
      setUnparsedLines(result.unparsedLines);

      const unconfirmedMsi = new Set<number>();
      const rows: ImportRow[] = result.expenses.map((e, i) => {
        const msi = detectMsi(e.description);
        if (msi === 'unknown') unconfirmedMsi.add(i);
        return {
          date: e.date,
          description: e.description,
          amount: e.amount,
          category: e.category,
          card: e.card,
          brand: e.brand,
          paidBy: defaultPerson,
          paymentType: e.paymentType,
          thirdPartyName: '',
          msiCurrent: typeof msi === 'object' && msi ? msi.current : undefined,
          msiTotal: typeof msi === 'object' && msi ? msi.total : undefined,
        };
      });

      await loadReviewRows(rows, null, result.detectedBank, unconfirmedMsi);
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Error al leer el PDF.';
      setParseError(message);
      setStep('upload');
    }
  };

  // ── JSON (Ryuko) HANDLING ─────────────────────────────────────

  const handleJsonFile = useCallback(async (f: File) => {
    if (f.size > 5 * 1024 * 1024) {
      toast.error('El archivo de importación no puede superar 5MB');
      return;
    }
    try {
      setJsonText(await f.text());
      setParseError(null);
    } catch {
      toast.error('No se pudo leer el archivo');
    }
  }, []);

  const processJson = async () => {
    setParseError(null);
    setImportErrors([]);
    let data: unknown;
    try {
      data = JSON.parse(jsonText);
    } catch {
      setParseError('El texto no es JSON válido. Pega el archivo completo que te pasó Ryuko.');
      return;
    }
    const v = validateImportFile(data);
    if ('fatal' in v) {
      setParseError(v.fatal);
      return;
    }
    setImportErrors(v.errors);
    setStep('parsing');
    await loadReviewRows(v.rows, v.batch, v.source.bank as BankKey);
    if (v.errors.length > 0) {
      toast.warning(`⚠️ ${v.errors.length} filas excluidas por errores — revisa el detalle`);
    }
  };

  // ── EDITING ───────────────────────────────────────────────────

  const update = (id: string, patch: Partial<ParsedExpense>) =>
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));

  // MSI patch semantics (EVE-013): a field ABSENT from the patch keeps its
  // current value; a field explicitly set to `null` CLEARS it. MSI is a
  // pair — clearing either number clears both, so a row can never hold half
  // an installment plan and the commit payload never carries a stray field.
  const setMsi = (e: ParsedExpense, patch: { msiCurrent?: number | null; msiTotal?: number | null; confirmed?: boolean }) => {
    const clearPair = patch.msiCurrent === null || patch.msiTotal === null;
    const msiCurrent = clearPair ? undefined
      : patch.msiCurrent !== undefined ? patch.msiCurrent : e.msiCurrent;
    const msiTotal = clearPair ? undefined
      : patch.msiTotal !== undefined ? patch.msiTotal : e.msiTotal;
    let flags = e.flags.filter(f => f !== 'msi' && f !== 'msi-unconfirmed');
    if (msiCurrent && msiTotal) flags = [...flags, 'msi'];
    else if (patch.confirmed === undefined && e.flags.includes('msi-unconfirmed')) {
      flags = [...flags, 'msi-unconfirmed'];
    }
    // Checking the MSI box on an unconfirmed row counts as Kevin confirming it.
    const selected = patch.confirmed === true && e.flags.includes('msi-unconfirmed')
      ? true
      : e.selected;
    update(e.id, { msiCurrent, msiTotal, flags, selected });
  };

  const remove = (id: string) =>
    setExpenses(prev => prev.filter(e => e.id !== id));

  const toggleAll = (selected: boolean) =>
    setExpenses(prev => prev.map(e => ({ ...e, selected })));

  const applyToAll = (patch: Partial<ParsedExpense>) =>
    setExpenses(prev => prev.map(e => ({ ...e, ...patch })));

  const addManual = () => {
    setExpenses(prev => [...prev, {
      id: nextId(),
      date: todayStr(),
      description: '',
      amount: 0,
      category: 'Otro',
      card: CARDS.find(c => !['efectivo', 'transferencia'].includes(c.value))?.value || 'bbva',
      brand: '',
      paidBy: defaultPerson,
      paymentType: 'credito',
      selected: true,
      expanded: true,
      isManual: true,
      flags: [],
    }]);
  };

  const promoteUnparsed = (line: string) => {
    const parts = line.match(/^(.+?)\s+[\$]?\s*([\d,]+\.?\d{0,2})\s*$/);
    const desc = parts ? parts[1].trim().slice(0, 120) : line.slice(0, 120);
    const amount = parts ? parseFloat(parts[2].replace(/,/g, '')) || 0 : 0;
    setExpenses(prev => [...prev, {
      id: nextId(),
      date: todayStr(),
      description: desc,
      amount: Math.abs(amount),
      category: guessCategory(desc),
      card: detectedBank !== 'generic' ? (CARDS.find(c => c.value === detectedBank)?.value || 'transferencia') : 'transferencia',
      brand: '',
      paidBy: defaultPerson,
      paymentType: 'credito',
      selected: true,
      expanded: true,
      isManual: true,
      flags: [],
    }]);
    setUnparsedLines(prev => prev.filter(l => l !== line));
  };

  // ── SAVING ────────────────────────────────────────────────────

  const saveSelected = async () => {
    const toSave = expenses.filter(e => e.selected && isCommittable(e));
    if (toSave.length === 0) {
      toast.error('Selecciona al menos un gasto con monto y descripción');
      return;
    }

    setStep('saving');
    setSavingCount(toSave.length);
    setSavedCount(0);

    let saved = 0;
    for (const e of toSave) {
      try {
        await onExpenseAdded({
          date: e.date, description: e.description.trim(), amount: e.amount,
          category: e.category, card: e.card, brand: e.brand,
          paidBy: e.paidBy, paymentType: e.paymentType,
          thirdPartyName: e.thirdPartyName,
          dedupeKey: e.dedupeKey,
          importBatch: e.importBatch,
          // MSI commits as a complete pair or not at all (EVE-013).
          ...(e.msiCurrent && e.msiTotal
            ? { msiCurrent: e.msiCurrent, msiTotal: e.msiTotal }
            : {}),
        });
        saved++;
        setSavedCount(saved);
      } catch { /* continue */ }
    }

    setSavedCount(saved);
    setStep('done');
    toast.success(`🤠 ${saved} gastos importados al Sheriff`);
  };

  const reset = () => {
    setStep('upload'); setFile(null); setExpenses([]); setUnparsedLines([]);
    setParseError(null); setSavingCount(0); setSavedCount(0);
    setJsonText(''); setImportErrors([]); setBatchLabel(null);
  };

  const selectedCount = expenses.filter(e => e.selected).length;
  // EVE-017: the button and the total promise only what save will commit.
  const committableRows = expenses.filter(e => e.selected && isCommittable(e));
  const totalAmount = committableRows.reduce((s, e) => s + e.amount, 0);
  const skippedSelected = expenses.filter(e => e.selected && !isCommittable(e));
  const skippedNoDesc = skippedSelected.filter(e => !e.description.trim()).length;
  const skippedNoAmount = skippedSelected.filter(e => e.description.trim() && !(e.amount > 0)).length;
  const skipReasons = [
    ...(skippedNoDesc > 0 ? [`${skippedNoDesc} sin descripción`] : []),
    ...(skippedNoAmount > 0 ? [`${skippedNoAmount} sin monto`] : []),
  ];
  const dupCount = expenses.filter(e => e.flags.some(f => f.includes('duplicate'))).length;

  // ── STEPS ─────────────────────────────────────────────────────

  if (step === 'upload') return (
    <div className="space-y-5 pb-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/15">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          Importar Estado de Cuenta
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Sube tu estado de cuenta en PDF, o importa el archivo que Ryuko preparó desde tu estado de cuenta.
          Todo pasa por revisión antes de guardarse — y los duplicados se marcan solos.
        </p>
      </div>

      {/* Source mode toggle */}
      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Fuente de importación">
        <button
          role="tab" aria-selected={mode === 'pdf'}
          onClick={() => setMode('pdf')}
          className={`h-11 rounded-xl border-2 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            mode === 'pdf' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
        >
          <FileText className="h-4 w-4" /> PDF del banco
        </button>
        <button
          role="tab" aria-selected={mode === 'json'}
          onClick={() => setMode('json')}
          className={`h-11 rounded-xl border-2 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            mode === 'json' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
        >
          <FileJson className="h-4 w-4" /> Archivo de Ryuko
        </button>
      </div>

      {mode === 'pdf' && (
        <>
          {/* Person selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">¿Quién pagó?</label>
            <Select value={defaultPerson} onValueChange={v => setDefaultPerson(v as Person)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="boyfriend">{PERSON_NAMES.boyfriend}</SelectItem>
                <SelectItem value="girlfriend">{PERSON_NAMES.girlfriend}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Drop zone - PDF only */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
              transition-all duration-200 select-none
              ${dragOver ? 'border-primary bg-primary/5 scale-[1.02]'
                : file ? 'border-accent bg-accent/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {file ? (
              <div className="space-y-2">
                <div className="text-5xl">📄</div>
                <p className="font-bold text-accent">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB · PDF
                </p>
                <button
                  onClick={ev => { ev.stopPropagation(); setFile(null); }}
                  className="text-xs text-destructive hover:underline"
                >✕ Cambiar archivo</button>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="font-semibold text-base">Arrastra tu estado de cuenta PDF aquí</p>
                  <p className="text-sm text-muted-foreground mt-1">o toca para seleccionar</p>
                  <p className="text-xs text-muted-foreground mt-2">Solo PDF · máx. 20MB</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-muted/40 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bancos compatibles</p>
            <div className="flex flex-wrap gap-2">
              {CARDS.filter(c => !['efectivo', 'transferencia'].includes(c.value)).map(c => (
                <div key={c.value} className="flex items-center gap-1.5 text-xs bg-background rounded-lg px-2.5 py-1.5 border border-border">
                  <CardBrandIcon card={c.value} className="h-3.5 w-3.5" />
                  {c.label}
                </div>
              ))}
            </div>
          </div>

          <Button onClick={parsePdf} disabled={!file} className="w-full h-12 text-base font-semibold">
            🔍 Analizar PDF
          </Button>
        </>
      )}

      {mode === 'json' && (
        <>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault(); setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleJsonFile(f);
            }}
            onClick={() => jsonInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all select-none ${
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
          >
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleJsonFile(f); }}
            />
            <FileJson className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="font-semibold text-sm mt-2">Arrastra el archivo .json de Ryuko aquí</p>
            <p className="text-xs text-muted-foreground mt-1">o toca para seleccionar · también puedes pegarlo abajo</p>
          </div>

          <Textarea
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            placeholder='{"format": "sheriff-statement-import", "version": "1.0", ...}'
            className="min-h-32 font-mono text-xs"
            aria-label="Contenido del archivo de importación"
          />

          <Button onClick={processJson} disabled={!jsonText.trim()} className="w-full h-12 text-base font-semibold">
            🔍 Revisar importación
          </Button>
        </>
      )}

      {parseError && (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{parseError}</p>
        </div>
      )}
    </div>
  );

  if (step === 'parsing') return (
    <div className="flex flex-col items-center justify-center py-24 space-y-6">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
        </div>
        <span className="absolute -bottom-2 -right-2 text-3xl animate-bounce">🤠</span>
      </div>
      <div className="text-center space-y-1">
        <p className="font-bold text-xl">El Sheriff está revisando...</p>
        <p className="text-sm text-muted-foreground">Validando y buscando duplicados</p>
      </div>
    </div>
  );

  if (step === 'saving') return (
    <div className="flex flex-col items-center justify-center py-24 space-y-6">
      <div className="text-6xl animate-bounce">💾</div>
      <div className="text-center">
        <p className="font-bold text-xl">Guardando gastos...</p>
        <p className="text-sm text-muted-foreground mt-1">{savedCount} de {savingCount}</p>
      </div>
      <div className="w-full max-w-xs h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${savingCount > 0 ? (savedCount / savingCount) * 100 : 0}%` }}
        />
      </div>
    </div>
  );

  if (step === 'done') return (
    <div className="flex flex-col items-center justify-center py-24 space-y-6">
      <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center">
        <Check className="h-12 w-12 text-accent" />
      </div>
      <div className="text-center">
        <p className="font-bold text-2xl">¡Listo, partner!</p>
        <p className="text-sm text-muted-foreground mt-2">{savedCount} gastos importados al Sheriff de Gastos</p>
      </div>
      <Button onClick={reset} className="w-full max-w-xs h-12">
        📄 Importar otro estado de cuenta
      </Button>
    </div>
  );

  // ── REVIEW ────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-32">

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold">Revisar transacciones</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {expenses.length} detectadas
            {batchLabel
              ? <> · Lote: <span className="font-medium">{batchLabel}</span></>
              : <> en <span className="font-medium truncate">{file?.name}</span> · Banco: {detectedBank}</>}
          </p>
        </div>
        <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0">
          <X className="h-3.5 w-3.5" /> Cancelar
        </button>
      </div>

      {importErrors.length > 0 && (
        <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> {importErrors.length} filas excluidas del archivo:
          </p>
          {importErrors.slice(0, 8).map((err, i) => <p key={i}>· {err}</p>)}
          {importErrors.length > 8 && <p>· …y {importErrors.length - 8} más</p>}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-muted/50 text-center">
          <p className="text-xl font-bold">{expenses.length}</p>
          <p className="text-[10px] text-muted-foreground">Detectados</p>
        </div>
        <div className="p-3 rounded-xl bg-accent/10 text-center">
          <p className="text-xl font-bold text-accent">{selectedCount}</p>
          <p className="text-[10px] text-muted-foreground">Seleccionados</p>
        </div>
        <div className="p-3 rounded-xl bg-primary/10 text-center">
          <p className="text-sm font-bold text-primary">{fmt(totalAmount)}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </div>
      </div>

      {dupCount > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {dupCount} filas marcadas como duplicadas — vienen deseleccionadas. Actívalas solo si estás seguro.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => toggleAll(true)} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">✓ Todos</button>
        <button onClick={() => toggleAll(false)} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">✗ Ninguno</button>
        <div className="ml-auto flex gap-1.5">
          <select defaultValue="" className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
            onChange={e => { if (e.target.value) { applyToAll({ paidBy: e.target.value as Person }); e.target.value = ''; } }}>
            <option value="">👤 Persona</option>
            <option value="boyfriend">{PERSON_NAMES.boyfriend}</option>
            <option value="girlfriend">{PERSON_NAMES.girlfriend}</option>
          </select>
          <select defaultValue="" className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background"
            onChange={e => { if (e.target.value) { applyToAll({ card: e.target.value }); e.target.value = ''; } }}>
            <option value="">💳 Tarjeta</option>
            {CARDS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <Button onClick={addManual} variant="outline" className="w-full h-10 text-sm">
        <Plus className="h-4 w-4 mr-2 inline" /> Añadir gasto manualmente
      </Button>

      <div className="space-y-2">
        {expenses.map(e => (
          <div key={e.id} className={`rounded-2xl border-2 overflow-hidden transition-all duration-200 ${
            e.selected ? 'border-primary/40 bg-background' : 'border-border/50 bg-muted/20 opacity-55'
          }`}>
            <div className="flex items-center gap-2 p-3">
              <button onClick={() => update(e.id, { selected: !e.selected })}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                  e.selected ? 'bg-primary border-primary' : 'border-muted-foreground'
                }`}>
                {e.selected && <Check className="h-3 w-3 text-primary-foreground" />}
              </button>
              <div className="p-1 rounded-lg bg-primary/10 shrink-0">
                <CategoryIcon category={e.category} className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-tight">{e.description || '(sin descripción)'}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {e.date} · {CARDS.find(c => c.value === e.card)?.label || e.card} · {PERSON_NAMES[e.paidBy]}
                </p>
                {e.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {e.flags.map(f => (
                      <span key={f} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                        f.includes('duplicate')
                          ? 'bg-destructive/15 text-destructive'
                          : f === 'msi'
                            ? 'bg-accent/20 text-accent-foreground'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      }`}>
                        {f === 'msi' && e.msiCurrent && e.msiTotal
                          ? `MSI ${e.msiCurrent}/${e.msiTotal} · se importa la mensualidad`
                          : FLAG_LABELS[f]}
                      </span>
                    ))}
                  </div>
                )}
                {e.note && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">📝 {e.note}</p>
                )}
              </div>
              <span className="font-bold text-sm shrink-0">{fmt(e.amount)}</span>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => update(e.id, { expanded: !e.expanded })}
                  className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/60 transition-colors">
                  {e.expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => remove(e.id)}
                  className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            </div>

            {e.expanded && (
              <div className="border-t border-border/50 px-3 pb-3 pt-3 grid grid-cols-2 gap-2 animate-in slide-in-from-top-1 duration-150">
                <div className="col-span-2">
                  <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Descripción</label>
                  <Input value={e.description} onChange={ev => update(e.id, { description: ev.target.value })} className="h-8 text-sm mt-0.5" />
                  {e.flags.includes('missing-description') && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                      Esta fila llegó sin descripción. Pregúntale a Kevin antes de inventar una.
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Monto (MXN)</label>
                  <Input type="number" step="0.01" value={e.amount || ''} onChange={ev => update(e.id, { amount: parseFloat(ev.target.value) || 0 })} className="h-8 text-sm mt-0.5" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Fecha</label>
                  <Input type="date" value={e.date} onChange={ev => update(e.id, { date: ev.target.value })} className="h-8 text-sm mt-0.5" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Categoría</label>
                  <Select value={e.category} onValueChange={v => update(e.id, { category: v })}>
                    <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}><span className="flex items-center gap-1.5"><CategoryIcon category={c} className="h-3 w-3" />{c}</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Tarjeta</label>
                  <Select value={e.card} onValueChange={v => update(e.id, { card: v })}>
                    <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CARDS.map(c => (
                        <SelectItem key={c.value} value={c.value}><span className="flex items-center gap-1.5"><CardBrandIcon card={c.value} className="h-3.5 w-3.5" />{c.label}</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Persona</label>
                  <Select value={e.paidBy} onValueChange={v => update(e.id, { paidBy: v as Person })}>
                    <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boyfriend">{PERSON_NAMES.boyfriend}</SelectItem>
                      <SelectItem value="girlfriend">{PERSON_NAMES.girlfriend}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Tipo de pago</label>
                  <Select value={e.paymentType || 'credito'} onValueChange={v => update(e.id, { paymentType: v as PaymentType })}>
                    <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credito">💳 Crédito</SelectItem>
                      <SelectItem value="debito">💰 Débito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Marca / Tienda</label>
                  <Input value={e.brand} onChange={ev => update(e.id, { brand: ev.target.value })} className="h-8 text-sm mt-0.5" placeholder="Opcional" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Gasto para alguien más (opcional)</label>
                  <Input value={e.thirdPartyName || ''} onChange={ev => update(e.id, { thirdPartyName: ev.target.value || undefined })} className="h-8 text-sm mt-0.5" placeholder="Nombre" maxLength={50} />
                </div>

                {/* MSI editor — Kevin confirms; the app never guesses */}
                <div className="col-span-2 rounded-xl border border-border/60 p-2.5 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={!!(e.msiCurrent && e.msiTotal)}
                      onChange={ev => {
                        if (ev.target.checked) setMsi(e, { msiCurrent: e.msiCurrent ?? 1, msiTotal: e.msiTotal ?? 12, confirmed: true });
                        else setMsi(e, { msiCurrent: null, msiTotal: null, confirmed: false });
                      }}
                    />
                    <Percent className="h-3.5 w-3.5" /> Es MSI (meses sin intereses)
                  </label>
                  {e.flags.includes('msi-unconfirmed') && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      El estado de cuenta sugiere MSI pero sin números claros. Confírmalo con Kevin — no se adivina.
                    </p>
                  )}
                  {!!(e.msiCurrent && e.msiTotal) && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">Mensualidad</span>
                      <Input type="number" min={1} max={60} value={e.msiCurrent}
                        onChange={ev => setMsi(e, { msiCurrent: ev.target.value === '' ? null : parseInt(ev.target.value, 10) || null, confirmed: true })}
                        className="h-8 w-16 text-sm" aria-label="Mensualidad actual" />
                      <span className="text-[11px] text-muted-foreground">de</span>
                      <Input type="number" min={1} max={60} value={e.msiTotal}
                        onChange={ev => setMsi(e, { msiTotal: ev.target.value === '' ? null : parseInt(ev.target.value, 10) || null, confirmed: true })}
                        className="h-8 w-16 text-sm" aria-label="Total de mensualidades" />
                      <span className="text-[11px] text-muted-foreground">— el monto de la fila ES la mensualidad</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Unparsed lines */}
      {unparsedLines.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-muted-foreground">Líneas sin clasificar ({unparsedLines.length})</h3>
          <p className="text-xs text-muted-foreground">Toca + para agregar como gasto manual</p>
          <div className="space-y-1">
            {unparsedLines.map((line, i) => (
              <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                <span className="truncate flex-1 font-mono text-xs">{line}</span>
                <button onClick={() => promoteUnparsed(line)}
                  className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors shrink-0">
                  <Plus className="h-4 w-4 text-primary" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="fixed bottom-16 left-0 right-0 px-4 pb-2 bg-background/90 backdrop-blur-sm border-t border-border z-20">
        <div className="max-w-2xl mx-auto pt-3">
          {skippedSelected.length > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-300 mb-2 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {skippedSelected.length} gasto(s) seleccionado(s) NO se guardarán ({skipReasons.join(' · ')}) — complétalos o deselecciónalos.
            </p>
          )}
          <Button onClick={saveSelected} disabled={committableRows.length === 0} className="w-full h-12 text-base font-semibold">
            💾 Importar {committableRows.length} gastos · {fmt(totalAmount)}
          </Button>
        </div>
      </div>
    </div>
  );
}
