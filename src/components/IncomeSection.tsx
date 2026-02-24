import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Income, Expense, Person, PERSON_NAMES } from '@/lib/types';
import { DollarSign, Plus, TrendingUp, TrendingDown, Minus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import sheriffBoy from '@/assets/sheriff-boy.png';
import sheriffGirl from '@/assets/sheriff-girl.png';

interface Props {
  incomes: Income[];
  expenses: Expense[];
  onAddIncome: (item: Omit<Income, 'id' | 'createdAt'>) => Promise<unknown>;
  onRemoveIncome: (id: string) => Promise<void>;
}

export default function IncomeSection({ incomes, expenses, onAddIncome, onRemoveIncome }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [person, setPerson] = useState<Person | ''>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalExpenses;

  const byPerson = useMemo(() => {
    const calc = (p: Person) => {
      const inc = incomes.filter(i => i.person === p).reduce((s, i) => s + i.amount, 0);
      const exp = expenses.filter(e => e.paidBy === p).reduce((s, e) => s + e.amount, 0);
      return { income: inc, expenses: exp, balance: inc - exp };
    };
    return { boyfriend: calc('boyfriend'), girlfriend: calc('girlfriend') };
  }, [incomes, expenses]);

  const handleCreate = async () => {
    if (!amount || !description.trim() || !person) return;
    setSubmitting(true);
    try {
      await onAddIncome({ amount: parseFloat(amount), description: description.trim(), person: person as Person, date });
      toast.success('Ingreso registrado.');
      setAmount(''); setDescription(''); setPerson(''); setOpen(false);
    } catch { toast.error('Error al guardar.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" /> Ingresos
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Agregar</Button></DialogTrigger>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader><DialogTitle>Registrar Ingreso</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-3">
                {([{ value: 'boyfriend' as Person, img: sheriffBoy, label: PERSON_NAMES.boyfriend }, { value: 'girlfriend' as Person, img: sheriffGirl, label: PERSON_NAMES.girlfriend }]).map(({ value, img, label }) => (
                  <button key={value} type="button" onClick={() => setPerson(value)}
                    className={`flex-1 flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all ${person === value ? 'border-primary bg-primary/10' : 'border-border'}`}>
                    <img src={img} alt={label} className="w-10 h-10 rounded-full" />
                    <span className="text-xs font-semibold">{label}</span>
                  </button>
                ))}
              </div>
              <div><Label className="text-xs">Monto (MXN)</Label><Input type="number" step="0.01" min="0" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} /></div>
              <div><Label className="text-xs">Descripcion</Label><Input placeholder="Concepto" value={description} onChange={e => setDescription(e.target.value)} maxLength={200} /></div>
              <div><Label className="text-xs">Fecha</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              <Button onClick={handleCreate} className="w-full" disabled={submitting}>{submitting ? 'Guardando...' : 'Registrar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card><CardContent className="pt-3 pb-3 text-center">
          <TrendingUp className="h-5 w-5 text-accent mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">Ingresos</p>
          <p className="text-sm font-bold">{fmt(totalIncome)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3 text-center">
          <TrendingDown className="h-5 w-5 text-destructive mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">Gastos</p>
          <p className="text-sm font-bold">{fmt(totalExpenses)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-3 text-center">
          <Minus className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">Saldo</p>
          <p className={`text-sm font-bold ${balance >= 0 ? 'text-accent' : 'text-destructive'}`}>{fmt(balance)}</p>
        </CardContent></Card>
      </div>

      {/* Per person */}
      <div className="grid grid-cols-2 gap-3">
        {([{ p: 'boyfriend' as Person, img: sheriffBoy }, { p: 'girlfriend' as Person, img: sheriffGirl }]).map(({ p, img }) => (
          <Card key={p}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <img src={img} alt="" className="h-6 w-6 rounded-full" />
                <span className="text-sm font-semibold">{PERSON_NAMES[p]}</span>
              </div>
              <div className="space-y-0.5 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Ingresos</span><span>{fmt(byPerson[p].income)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Gastos</span><span>{fmt(byPerson[p].expenses)}</span></div>
                <div className="flex justify-between font-semibold"><span>Saldo</span><span className={byPerson[p].balance >= 0 ? 'text-accent' : 'text-destructive'}>{fmt(byPerson[p].balance)}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Income list */}
      {incomes.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Historial</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
              {incomes.slice().reverse().map(i => (
                <div key={i.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={i.person === 'boyfriend' ? sheriffBoy : sheriffGirl} alt="" className="w-6 h-6 rounded-full shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{i.description}</p>
                      <p className="text-xs text-muted-foreground">{i.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-bold text-sm text-accent">{fmt(i.amount)}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onRemoveIncome(i.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
