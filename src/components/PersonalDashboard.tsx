import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Expense, CARDS, PERSON_NAMES, CATEGORIES, Person } from '@/lib/types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowLeft, Wallet } from 'lucide-react';
import CategoryIcon from '@/components/CategoryIcon';
import ExpenseEditDialog from '@/components/ExpenseEditDialog';
import sheriffBoy from '@/assets/sheriff-boy.png';
import sheriffGirl from '@/assets/sheriff-girl.png';

const COLORS = [
  'hsl(15, 65%, 52%)', 'hsl(45, 55%, 65%)', 'hsl(145, 30%, 45%)',
  'hsl(200, 40%, 55%)', 'hsl(280, 30%, 55%)', 'hsl(0, 65%, 55%)',
];

const cardLabelMap = Object.fromEntries(CARDS.map(c => [c.value, c.label]));

interface Props {
  person: Person;
  expenses: Expense[];
  onBack: () => void;
  onUpdateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
}

export default function PersonalDashboard({ person, expenses, onBack, onUpdateExpense, onDeleteExpense }: Props) {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const [dateTo, setDateTo] = useState(now.toISOString().split('T')[0]);
  const [filterCard, setFilterCard] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editExpense, setEditExpense] = useState<Expense | null>(null);

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      if (e.paidBy !== person) return false;
      if (e.date < dateFrom || e.date > dateTo) return false;
      if (filterCard !== 'all' && e.card !== filterCard) return false;
      if (filterCategory !== 'all' && e.category !== filterCategory) return false;
      return true;
    });
  }, [expenses, person, dateFrom, dateTo, filterCard, filterCategory]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
  const avatar = person === 'boyfriend' ? sheriffBoy : sheriffGirl;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <img src={avatar} alt="" className="h-8 w-8 rounded-full" />
        <h2 className="text-lg font-bold">{PERSON_NAMES[person]}</h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div><Label className="text-xs">Desde</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Hasta</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Tarjeta</Label>
          <Select value={filterCard} onValueChange={setFilterCard}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas</SelectItem>{CARDS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Categoria</Label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas</SelectItem>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4 flex items-center gap-3">
          <Wallet className="h-8 w-8 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Total gastos</p>
            <p className="text-xl font-bold">{fmt(total)}</p>
            <p className="text-xs text-muted-foreground">{filtered.length} registros</p>
          </div>
        </CardContent>
      </Card>

      {byCategory.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Por Categoria</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={false}>
                  {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend layout="vertical" align="right" verticalAlign="middle" formatter={(v: string) => <span className="text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Gastos</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
            {filtered.slice().reverse().map(e => (
              <div key={e.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors" onClick={() => setEditExpense(e)}>
                <div className="flex items-center gap-2 min-w-0">
                  <CategoryIcon category={e.category} className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{e.description}</p>
                    <p className="text-xs text-muted-foreground truncate">{e.category} · {cardLabelMap[e.card] || e.card} · {e.date}</p>
                  </div>
                </div>
                <span className="font-bold text-sm shrink-0 ml-2">{fmt(e.amount)}</span>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Sin gastos registrados</p>}
          </div>
        </CardContent>
      </Card>

      <ExpenseEditDialog expense={editExpense} open={!!editExpense} onOpenChange={o => !o && setEditExpense(null)} onUpdate={onUpdateExpense} onDelete={onDeleteExpense} />
    </div>
  );
}
