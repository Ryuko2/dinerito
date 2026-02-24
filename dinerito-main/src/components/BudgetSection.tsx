import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Budget, Expense, CATEGORIES, PERSON_NAMES, Person } from '@/lib/types';
import { PieChart as PieChartIcon, Plus, Trash2, AlertTriangle, AlertCircle } from 'lucide-react';
import CategoryIcon from '@/components/CategoryIcon';
import { toast } from 'sonner';

interface Props {
  budgets: Budget[];
  expenses: Expense[];
  onAddBudget: (item: Omit<Budget, 'id' | 'createdAt'>) => Promise<unknown>;
  onRemoveBudget: (id: string) => Promise<void>;
}

function getPeriodDates(period: Budget['period']): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  if (period === 'weekly') {
    const day = now.getDay();
    const start = new Date(y, m, d - day);
    const end = new Date(y, m, d + (6 - day));
    return { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] };
  }
  if (period === 'biweekly') {
    const half = d <= 15 ? 1 : 16;
    const endDay = d <= 15 ? 15 : new Date(y, m + 1, 0).getDate();
    return { from: `${y}-${String(m + 1).padStart(2, '0')}-${String(half).padStart(2, '0')}`, to: `${y}-${String(m + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}` };
  }
  return { from: `${y}-${String(m + 1).padStart(2, '0')}-01`, to: `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}` };
}

const PERIOD_LABELS: Record<string, string> = { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual' };

export default function BudgetSection({ budgets, expenses, onAddBudget, onRemoveBudget }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('all');
  const [person, setPerson] = useState<Person | 'all'>('all');
  const [limit, setLimit] = useState('');
  const [period, setPeriod] = useState<Budget['period']>('monthly');
  const [submitting, setSubmitting] = useState(false);

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

  const budgetProgress = useMemo(() => {
    return budgets.map(b => {
      const { from, to } = getPeriodDates(b.period);
      const spent = expenses.filter(e => {
        if (e.date < from || e.date > to) return false;
        if (b.category !== 'all' && e.category !== b.category) return false;
        if (b.person !== 'all' && e.paidBy !== b.person) return false;
        return true;
      }).reduce((s, e) => s + e.amount, 0);
      const pct = b.limitAmount > 0 ? (spent / b.limitAmount) * 100 : 0;

      // Trend alert: days elapsed vs percentage spent
      const periodDates = getPeriodDates(b.period);
      const totalDays = Math.max(1, (new Date(periodDates.to).getTime() - new Date(periodDates.from).getTime()) / 86400000);
      const elapsed = Math.max(1, (Date.now() - new Date(periodDates.from).getTime()) / 86400000);
      const projectedPct = (pct / elapsed) * totalDays;
      const willExceed = projectedPct > 100 && pct < 100;

      return { ...b, spent, pct, willExceed };
    });
  }, [budgets, expenses]);

  const handleCreate = async () => {
    if (!name.trim() || !limit) return;
    setSubmitting(true);
    try {
      await onAddBudget({ name: name.trim(), category, person, limitAmount: parseFloat(limit), period });
      toast.success('Presupuesto creado.');
      setName(''); setCategory('all'); setPerson('all'); setLimit(''); setOpen(false);
    } catch { toast.error('Error al crear.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-primary" /> Presupuestos
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuevo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear Presupuesto</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs">Nombre</Label><Input placeholder="Ej: Comida mensual" value={name} onChange={e => setName(e.target.value)} maxLength={50} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Todas</SelectItem>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Persona</Label>
                  <Select value={person} onValueChange={v => setPerson(v as Person | 'all')}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="boyfriend">{PERSON_NAMES.boyfriend}</SelectItem><SelectItem value="girlfriend">{PERSON_NAMES.girlfriend}</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Limite (MXN)</Label><Input type="number" step="0.01" min="0" placeholder="0.00" value={limit} onChange={e => setLimit(e.target.value)} /></div>
                <div><Label className="text-xs">Periodo</Label>
                  <Select value={period} onValueChange={v => setPeriod(v as Budget['period'])}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="weekly">Semanal</SelectItem><SelectItem value="biweekly">Quincenal</SelectItem><SelectItem value="monthly">Mensual</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={submitting}>{submitting ? 'Creando...' : 'Crear'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {budgetProgress.length === 0 ? (
        <Card><CardContent className="py-10 text-center">
          <PieChartIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Sin presupuestos creados</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {budgetProgress.map(b => (
            <Card key={b.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {b.category !== 'all' && <CategoryIcon category={b.category} className="h-5 w-5 text-primary" />}
                    <div>
                      <p className="font-bold text-sm">{b.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {PERIOD_LABELS[b.period]}
                        {b.person !== 'all' && ` · ${PERSON_NAMES[b.person as Person]}`}
                        {b.category !== 'all' && ` · ${b.category}`}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onRemoveBudget(b.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span>{fmt(b.spent)} / {fmt(b.limitAmount)}</span>
                  <span className="font-semibold">{Math.min(b.pct, 100).toFixed(0)}%</span>
                </div>
                <Progress value={Math.min(b.pct, 100)} className={`h-2.5 ${b.pct >= 100 ? '[&>div]:bg-destructive' : b.pct >= 80 ? '[&>div]:bg-[hsl(var(--warning))]' : ''}`} />
                {b.pct >= 100 && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" /> Presupuesto excedido
                  </div>
                )}
                {b.pct >= 80 && b.pct < 100 && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-[hsl(var(--warning))]">
                    <AlertTriangle className="h-3.5 w-3.5" /> Al 80% del limite
                  </div>
                )}
                {b.willExceed && b.pct < 80 && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-[hsl(var(--warning))]">
                    <AlertTriangle className="h-3.5 w-3.5" /> Tendencia indica que se excedera
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
