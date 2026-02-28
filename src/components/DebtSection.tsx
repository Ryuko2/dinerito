import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Debt, RecurringExpense, Expense, Income, CATEGORIES, PERSON_NAMES, Person } from '@/lib/types';
import { CreditCard, RefreshCw, Plus, Trash2, Check } from 'lucide-react';
import { useFormatCurrency } from '@/lib/settings';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';

interface Props {
  debts: Debt[];
  recurring: RecurringExpense[];
  expenses: Expense[];
  incomes: Income[];
  onAddDebt: (d: Omit<Debt, 'id' | 'createdAt'>) => Promise<unknown>;
  onUpdateDebt: (id: string, updates: Partial<Debt>) => Promise<void>;
  onRemoveDebt: (id: string) => Promise<void>;
  onAddRecurring: (r: Omit<RecurringExpense, 'id' | 'createdAt'>) => Promise<unknown>;
  onUpdateRecurring: (id: string, updates: Partial<RecurringExpense>) => Promise<void>;
  onRemoveRecurring: (id: string) => Promise<void>;
}

export default function DebtSection({
  debts, recurring, onAddDebt, onUpdateDebt, onRemoveDebt,
  onAddRecurring, onUpdateRecurring, onRemoveRecurring
}: Props) {
  const { t } = useI18n();
  const fmt = useFormatCurrency();

  const [debtOpen, setDebtOpen] = useState(false);
  const [debtName, setDebtName] = useState('');
  const [debtTotal, setDebtTotal] = useState('');
  const [debtPerson, setDebtPerson] = useState<Person | 'all'>('all');
  const [debtDue, setDebtDue] = useState('');
  const [debtNotes, setDebtNotes] = useState('');
  const [debtSubmitting, setDebtSubmitting] = useState(false);

  const [recOpen, setRecOpen] = useState(false);
  const [recName, setRecName] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recCategory, setRecCategory] = useState('Suscripciones');
  const [recPerson, setRecPerson] = useState<Person | 'all'>('all');
  const [recFreq, setRecFreq] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
  const [recStart, setRecStart] = useState(new Date().toISOString().split('T')[0]);
  const [recSubmitting, setRecSubmitting] = useState(false);

  const [payId, setPayId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');

  const totalDebt = useMemo(() => debts.reduce((s, d) => s + (d.totalAmount - d.amountPaid), 0), [debts]);
  const monthlyRecurring = useMemo(() => recurring.filter(r => r.active).reduce((s, r) => {
    if (r.frequency === 'monthly') return s + r.amount;
    if (r.frequency === 'biweekly') return s + r.amount * 2;
    return s + r.amount * 4.33;
  }, 0), [recurring]);

  const handleAddDebt = async () => {
    if (!debtName.trim() || !debtTotal) return;
    setDebtSubmitting(true);
    try {
      await onAddDebt({
        name: debtName.trim(),
        totalAmount: parseFloat(debtTotal),
        amountPaid: 0,
        person: debtPerson,
        dueDate: debtDue || undefined,
        notes: debtNotes || undefined,
      });
      toast.success(t('debtRegistered'));
      setDebtName(''); setDebtTotal(''); setDebtPerson('all'); setDebtDue(''); setDebtNotes('');
      setDebtOpen(false);
    } catch { toast.error(t('errorSaving')); }
    finally { setDebtSubmitting(false); }
  };

  const handleAddRecurring = async () => {
    if (!recName.trim() || !recAmount) return;
    setRecSubmitting(true);
    try {
      await onAddRecurring({
        name: recName.trim(),
        amount: parseFloat(recAmount),
        category: recCategory,
        person: recPerson,
        frequency: recFreq,
        startDate: recStart,
        active: true,
      });
      toast.success(t('recurringAdded'));
      setRecName(''); setRecAmount(''); setRecOpen(false);
    } catch { toast.error(t('errorSaving')); }
    finally { setRecSubmitting(false); }
  };

  const handlePayDebt = async (debt: Debt) => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;
    const newPaid = Math.min(debt.amountPaid + amount, debt.totalAmount);
    await onUpdateDebt(debt.id, { amountPaid: newPaid });
    toast.success(t('paymentRecorded'));
    setPayId(null); setPayAmount('');
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-sm bg-destructive/5">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">{t('totalDebtPending')}</p>
            <p className="text-lg font-bold text-destructive">{fmt(totalDebt)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-orange-500/5">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">{t('recurringPerMonth')}</p>
            <p className="text-lg font-bold text-orange-500">{fmt(monthlyRecurring)}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> {t('debts')}
          </h2>
          <Dialog open={debtOpen} onOpenChange={setDebtOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> {t('newDebt')}</Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined}>
              <DialogHeader><DialogTitle>{t('registerDebt')}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="text-xs">{t('name')}</Label>
                  <Input placeholder="Ej: Préstamo del carro" value={debtName} onChange={e => setDebtName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">{t('amountMxn')}</Label>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" value={debtTotal} onChange={e => setDebtTotal(e.target.value)} />
                  </div>
                  <div><Label className="text-xs">{t('person')}</Label>
                    <Select value={debtPerson} onValueChange={v => setDebtPerson(v as Person | 'all')}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('both')}</SelectItem>
                        <SelectItem value="boyfriend">{PERSON_NAMES.boyfriend}</SelectItem>
                        <SelectItem value="girlfriend">{PERSON_NAMES.girlfriend}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label className="text-xs">{t('dueDateOptional')}</Label>
                  <Input type="date" value={debtDue} onChange={e => setDebtDue(e.target.value)} />
                </div>
                <div><Label className="text-xs">{t('notesOptional')}</Label>
                  <Input placeholder="Ej: Pago mensual $500" value={debtNotes} onChange={e => setDebtNotes(e.target.value)} />
                </div>
                <Button onClick={handleAddDebt} className="w-full" disabled={debtSubmitting}>
                  {debtSubmitting ? t('saving2') : t('registerDebt')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {debts.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-10 text-center">
              <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('noDebts')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {debts.map(debt => {
              const remaining = debt.totalAmount - debt.amountPaid;
              const pct = (debt.amountPaid / debt.totalAmount) * 100;
              const isPaid = remaining <= 0;
              return (
                <Card key={debt.id} className={`border-0 shadow-sm ${isPaid ? 'opacity-60' : ''}`}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          {isPaid && <Check className="h-3.5 w-3.5 text-accent" />}
                          <p className="font-semibold text-sm">{debt.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('paid')}: {fmt(debt.amountPaid)} / {fmt(debt.totalAmount)}
                          {debt.person !== 'all' && ` · ${PERSON_NAMES[debt.person as Person]}`}
                          {debt.dueDate && ` · ${t('due')}: ${debt.dueDate}`}
                        </p>
                        {debt.notes && <p className="text-xs text-muted-foreground italic">{debt.notes}</p>}
                      </div>
                      <div className="flex gap-1">
                        {!isPaid && (
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs"
                            onClick={() => setPayId(payId === debt.id ? null : debt.id)}>
                            {t('contribute')}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                          onClick={() => onRemoveDebt(debt.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Progress value={pct} className={`h-2 mb-1 ${isPaid ? '[&>div]:bg-accent' : ''}`} />
                    <p className={`text-xs text-right font-semibold ${isPaid ? 'text-accent' : 'text-destructive'}`}>
                      {isPaid ? `✓ ${t('paidLabel')}` : `${t('remaining')}: ${fmt(remaining)}`}
                    </p>
                    {payId === debt.id && (
                      <div className="flex gap-2 mt-2">
                        <Input type="number" step="0.01" min="0" placeholder={t('amountToPay')}
                          value={payAmount} onChange={e => setPayAmount(e.target.value)}
                          className="h-8 text-sm flex-1" />
                        <Button size="sm" className="h-8" onClick={() => handlePayDebt(debt)}>✓</Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setPayId(null)}>✕</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" /> {t('recurringExpensesSection')}
          </h2>
          <Dialog open={recOpen} onOpenChange={setRecOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> {t('add')}</Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined}>
              <DialogHeader><DialogTitle>{t('recurringExpense')}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="text-xs">{t('name')}</Label>
                  <Input placeholder="Ej: Netflix, Gym, Renta" value={recName} onChange={e => setRecName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">{t('amountMxn')}</Label>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" value={recAmount} onChange={e => setRecAmount(e.target.value)} />
                  </div>
                  <div><Label className="text-xs">{t('frequency')}</Label>
                    <Select value={recFreq} onValueChange={v => setRecFreq(v as typeof recFreq)}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">{t('weekly')}</SelectItem>
                        <SelectItem value="biweekly">{t('biweekly')}</SelectItem>
                        <SelectItem value="monthly">{t('monthly')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">{t('category')}</Label>
                    <Select value={recCategory} onValueChange={setRecCategory}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">{t('person')}</Label>
                    <Select value={recPerson} onValueChange={v => setRecPerson(v as Person | 'all')}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('both')}</SelectItem>
                        <SelectItem value="boyfriend">{PERSON_NAMES.boyfriend}</SelectItem>
                        <SelectItem value="girlfriend">{PERSON_NAMES.girlfriend}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label className="text-xs">{t('startDate')}</Label>
                  <Input type="date" value={recStart} onChange={e => setRecStart(e.target.value)} />
                </div>
                <Button onClick={handleAddRecurring} className="w-full" disabled={recSubmitting}>
                  {recSubmitting ? t('saving2') : t('addRecurring')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {recurring.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-10 text-center">
              <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('noRecurring')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('addRecurringHint')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recurring.map(r => (
              <Card key={r.id} className={`border-0 shadow-sm ${!r.active ? 'opacity-50' : ''}`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${r.active ? 'bg-accent' : 'bg-muted-foreground'}`} />
                      <div>
                        <p className="font-semibold text-sm">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmt(r.amount)} · {r.frequency === 'weekly' ? t('weekly') : r.frequency === 'biweekly' ? t('biweekly') : t('monthly')} · {r.category}
                          {r.person !== 'all' && ` · ${PERSON_NAMES[r.person as Person]}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs"
                        onClick={() => onUpdateRecurring(r.id, { active: !r.active })}>
                        {r.active ? t('pause') : t('activate')}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                        onClick={() => onRemoveRecurring(r.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
