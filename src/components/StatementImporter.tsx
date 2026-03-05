import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORIES, CARDS, PERSON_NAMES, Person, PaymentType } from '@/lib/types';
import CategoryIcon from '@/components/CategoryIcon';
import CardBrandIcon from '@/components/CardBrandIcon';
import { extractTextFromPDF, parseStatement, guessCategory, type BankKey } from '@/lib/statementParser';
import {
  Upload, Loader2, Check, X, AlertTriangle,
  ChevronDown, ChevronUp, Trash2, FileText, Plus
} from 'lucide-react';
import { toast } from 'sonner';

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
  selected: boolean;
  expanded: boolean;
  isManual?: boolean;
}

type AddExpenseFn = (item: {
  amount: number; description: string; category: string;
  card: string; brand: string; paidBy: Person;
  date: string; paymentType?: PaymentType;
}) => Promise<unknown>;

interface Props {
  onExpenseAdded: AddExpenseFn;
}

type Step = 'upload' | 'parsing' | 'review' | 'saving' | 'done';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

const todayStr = () => new Date().toISOString().split('T')[0];

export default function StatementImporter({ onExpenseAdded }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [defaultPerson, setDefaultPerson] = useState<Person>('boyfriend');
  const [expenses, setExpenses] = useState<ParsedExpense[]>([]);
  const [unparsedLines, setUnparsedLines] = useState<string[]>([]);
  const [detectedBank, setDetectedBank] = useState<BankKey>('generic');
  const [parseError, setParseError] = useState<string | null>(null);
  const [savingCount, setSavingCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(0);

  const nextId = () => `p-${++idCounter.current}-${Date.now()}`;

  // ── FILE HANDLING ─────────────────────────────────────────────

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

  // ── PARSING (regex, no AI) ─────────────────────────────────────

  const parsePdf = async () => {
    if (!file) return;
    setStep('parsing');
    setParseError(null);

    try {
      const text = await extractTextFromPDF(file);
      if (!text.trim()) {
        setParseError('No se pudo extraer texto del PDF. Verifica que el documento sea válido.');
        setStep('upload');
        return;
      }

      const result = parseStatement(text);

      const mapped: ParsedExpense[] = result.expenses.map((e, i) => ({
        id: nextId(),
        date: e.date,
        description: e.description,
        amount: e.amount,
        category: e.category,
        card: e.card,
        brand: e.brand,
        paidBy: defaultPerson,
        paymentType: e.paymentType,
        selected: true,
        expanded: false,
        isManual: false,
      }));

      setExpenses(mapped);
      setUnparsedLines(result.unparsedLines);
      setDetectedBank(result.detectedBank);
      setStep('review');
      toast.success(`✅ ${mapped.length} transacciones detectadas` + (result.unparsedLines.length > 0 ? ` · ${result.unparsedLines.length} sin clasificar` : ''));

    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Error al leer el PDF.';
      setParseError(message);
      setStep('upload');
    }
  };

  // ── EDITING ───────────────────────────────────────────────────

  const update = (id: string, patch: Partial<ParsedExpense>) =>
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));

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
    }]);
    setUnparsedLines(prev => prev.filter(l => l !== line));
  };

  // ── SAVING ────────────────────────────────────────────────────

  const saveSelected = async () => {
    const toSave = expenses.filter(e => e.selected && e.amount > 0 && e.description.trim());
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
  };

  const selectedCount = expenses.filter(e => e.selected).length;
  const totalAmount = expenses.filter(e => e.selected).reduce((s, e) => s + e.amount, 0);

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
          Sube tu estado de cuenta en PDF. El Sheriff lo lee y clasifica cada cargo automáticamente (sin IA, 100% gratis).
        </p>
      </div>

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

      {parseError && (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{parseError}</p>
        </div>
      )}

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
        <p className="font-bold text-xl">El Sheriff está leyendo tu PDF...</p>
        <p className="text-sm text-muted-foreground">Extrayendo y clasificando cada cargo</p>
      </div>
      <div className="space-y-2 w-full max-w-xs">
        {['Extrayendo texto...', 'Buscando transacciones...', 'Clasificando categorías...'].map((l, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin shrink-0" />{l}
          </div>
        ))}
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
            {expenses.length} detectadas en <span className="font-medium truncate">{file?.name}</span> · Banco: {detectedBank}
          </p>
        </div>
        <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0">
          <X className="h-3.5 w-3.5" /> Cancelar
        </button>
      </div>

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
          <Button onClick={saveSelected} disabled={selectedCount === 0} className="w-full h-12 text-base font-semibold">
            💾 Importar {selectedCount} gastos · {fmt(totalAmount)}
          </Button>
        </div>
      </div>
    </div>
  );
}
