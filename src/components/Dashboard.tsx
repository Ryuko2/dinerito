import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Expense, CARDS, PERSON_NAMES, CATEGORIES, Person } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Wallet, CreditCard, Filter } from 'lucide-react';
import CategoryIcon from '@/components/CategoryIcon';
import CardBrandIcon from '@/components/CardBrandIcon';
import ExpenseEditDialog from '@/components/ExpenseEditDialog';
import PersonalDashboard from '@/components/PersonalDashboard';
import sheriffBoy from '@/assets/sheriff-boy.png';
import sheriffGirl from '@/assets/sheriff-girl.png';

const COLORS = [
  'hsl(15, 65%, 52%)', 'hsl(45, 55%, 65%)', 'hsl(145, 30%, 45%)',
  'hsl(200, 40%, 55%)', 'hsl(280, 30%, 55%)', 'hsl(0, 65%, 55%)',
  'hsl(30, 60%, 50%)', 'hsl(170, 40%, 45%)', 'hsl(60, 50%, 50%)', 'hsl(320, 30%, 50%)',
];

const cardLabelMap = Object.fromEntries(CARDS.map(c => [c.value, c.label]));

interface Props {
  expenses: Expense[];
  onUpdateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
}

export default function Dashboard({ expenses, onUpdateExpense, onDeleteExpense }: Props) {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const todayStr = now.toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(todayStr);
  const [filterPerson, setFilterPerson] = useState<string>('all');
  const [filterCard, setFilterCard] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPaymentType, setFilterPaymentType] = useState<string>('all');
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [personalPerson, setPersonalPerson] = useState<Person | null>(null);
  const [avatarViewer, setAvatarViewer] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      if (e.date < dateFrom || e.date > dateTo) return false;
      if (filterPerson !== 'all' && e.paidBy !== filterPerson) return false;
      if (filterCard !== 'all' && e.card !== filterCard) return false;
      if (filterCategory !== 'all' && e.category !== filterCategory) return false;
      if (filterPaymentType !== 'all' && (e.paymentType || '') !== filterPaymentType) return false;
      return true;
    });
  }, [expenses, dateFrom, dateTo, filterPerson, filterCard, filterCategory, filterPaymentType]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const boyfriendTotal = filtered.filter(e => e.paidBy === 'boyfriend').reduce((s, e) => s + e.amount, 0);
  const girlfriendTotal = filtered.filter(e => e.paidBy === 'girlfriend').reduce((s, e) => s + e.amount, 0);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const byMonth = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => {
      const d = new Date(e.date);
      const key = d.toLocaleDateString('es-MX', { month: 'short' });
      map[key] = (map[key] || 0) + e.amount;
    });
    return Object.entries(map).map(([name, total]) => ({ name, total }));
  }, [filtered]);

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

  if (personalPerson) {
    return (
      <PersonalDashboard
        person={personalPerson}
        expenses={expenses}
        onBack={() => setPersonalPerson(null)}
        onUpdateExpense={onUpdateExpense}
        onDeleteExpense={onDeleteExpense}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/15">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          Dashboard
        </h2>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filtros</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Persona</Label>
              <Select value={filterPerson} onValueChange={setFilterPerson}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="boyfriend">{PERSON_NAMES.boyfriend}</SelectItem>
                  <SelectItem value="girlfriend">{PERSON_NAMES.girlfriend}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tarjeta</Label>
              <Select value={filterCard} onValueChange={setFilterCard}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {CARDS.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <CardBrandIcon card={c.value} className="h-4 w-4" />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>
                      <span className="flex items-center gap-2">
                        <CategoryIcon category={c} className="h-3.5 w-3.5" />
                        {c}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tipo pago</Label>
              <Select value={filterPaymentType} onValueChange={setFilterPaymentType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="credito">Credito</SelectItem>
                  <SelectItem value="debito">Debito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-0 shadow-md bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/15">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Total</p>
              <p className="text-xl font-bold">{fmt(total)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 ring-primary/30 transition-all border-0 shadow-md" onClick={() => setPersonalPerson('boyfriend')}>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <img
              src={sheriffBoy}
              alt={PERSON_NAMES.boyfriend}
              className="h-10 w-10 rounded-full ring-2 ring-primary/20 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setAvatarViewer(sheriffBoy); }}
            />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{PERSON_NAMES.boyfriend}</p>
              <p className="text-xl font-bold">{fmt(boyfriendTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 ring-primary/30 transition-all border-0 shadow-md" onClick={() => setPersonalPerson('girlfriend')}>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <img
              src={sheriffGirl}
              alt={PERSON_NAMES.girlfriend}
              className="h-10 w-10 rounded-full ring-2 ring-accent/20 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setAvatarViewer(sheriffGirl); }}
            />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{PERSON_NAMES.girlfriend}</p>
              <p className="text-xl font-bold">{fmt(girlfriendTotal)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Sin gastos registrados</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={false}>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    formatter={(value: string) => <span className="text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Tendencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {byMonth.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Sin gastos registrados</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byMonth}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="total" fill="hsl(15, 65%, 52%)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense list */}
      {filtered.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Gastos ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto overscroll-contain">
              {filtered.slice().reverse().map(e => (
                <div
                  key={e.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40 cursor-pointer hover:bg-muted/70 transition-all active:scale-[0.98] group"
                  onClick={() => setEditExpense(e)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                      <CategoryIcon category={e.category} className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.description}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CardBrandIcon card={e.card} className="h-3.5 w-3.5" />
                        <span className="truncate">{cardLabelMap[e.card] || e.card} · {e.date}</span>
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-sm shrink-0 ml-2">{fmt(e.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ExpenseEditDialog
        expense={editExpense}
        open={!!editExpense}
        onOpenChange={open => !open && setEditExpense(null)}
        onUpdate={onUpdateExpense}
        onDelete={onDeleteExpense}
      />

      <Dialog open={!!avatarViewer} onOpenChange={() => setAvatarViewer(null)}>
        <DialogContent className="max-w-xs p-2">
          {avatarViewer && <img src={avatarViewer} alt="Avatar" className="w-full rounded-xl" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
