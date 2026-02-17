import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Expense, CARDS, PERSON_NAMES } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Wallet, CreditCard, Calendar } from 'lucide-react';
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
}

export default function Dashboard({ expenses }: Props) {
  const [period, setPeriod] = useState<'month' | 'year'>('month');

  const filtered = useMemo(() => {
    const now = new Date();
    return expenses.filter(e => {
      const d = new Date(e.date);
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return d.getFullYear() === now.getFullYear();
    });
  }, [expenses, period]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> Dashboard
        </h2>
        <Tabs value={period} onValueChange={v => setPeriod(v as 'month' | 'year')}>
          <TabsList>
            <TabsTrigger value="month"><Calendar className="h-3.5 w-3.5 mr-1" />Mes</TabsTrigger>
            <TabsTrigger value="year"><Calendar className="h-3.5 w-3.5 mr-1" />Año</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="card-hover">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Wallet className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{fmt(total)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <img src={sheriffBoy} alt={PERSON_NAMES.boyfriend} className="h-8 w-8 rounded-full" />
            <div>
              <p className="text-xs text-muted-foreground">{PERSON_NAMES.boyfriend} gastó</p>
              <p className="text-xl font-bold">{fmt(boyfriendTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <img src={sheriffGirl} alt={PERSON_NAMES.girlfriend} className="h-8 w-8 rounded-full" />
            <div>
              <p className="text-xs text-muted-foreground">{PERSON_NAMES.girlfriend} gastó</p>
              <p className="text-xl font-bold">{fmt(girlfriendTotal)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Sin gastos aún 🌵</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Tendencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {byMonth.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Sin gastos aún 🌵</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byMonth}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="total" fill="hsl(15, 65%, 52%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent expenses */}
      {filtered.length > 0 && (
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Últimos Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filtered.slice().reverse().slice(0, 10).map(e => (
                <div key={e.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <img src={e.paidBy === 'boyfriend' ? sheriffBoy : sheriffGirl} alt="" className="w-7 h-7 rounded-full" />
                    <div>
                      <p className="text-sm font-medium">{e.description}</p>
                      <p className="text-xs text-muted-foreground">{e.category} · {e.brand || 'Sin marca'} · {cardLabelMap[e.card] || e.card}</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm">{fmt(e.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
