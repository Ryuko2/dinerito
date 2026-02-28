import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Expense, Income, PERSON_NAMES } from '@/lib/types';
import { Thermometer, TrendingUp, TrendingDown } from 'lucide-react';
import sheriffBoy from '@/assets/sheriff-boy.png';
import sheriffGirl from '@/assets/sheriff-girl.png';

interface Props {
  expenses: Expense[];
  incomes: Income[];
}

type ThermoStatus = 'ok' | 'warm' | 'hot' | 'danger';

function getThermoStatus(ratio: number): ThermoStatus {
  if (ratio <= 0.5) return 'ok';
  if (ratio <= 0.8) return 'warm';
  if (ratio <= 1) return 'hot';
  return 'danger';
}

export default function GastometerSection({ expenses, incomes }: Props) {
  const totalIncome = useMemo(() => incomes.reduce((s, i) => s + i.amount, 0), [incomes]);
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const ratio = totalIncome > 0 ? totalExpenses / totalIncome : 0;
  const status = getThermoStatus(ratio);
  const pct = Math.min(ratio * 100, 120);

  const byPerson = useMemo(() => {
    const calc = (p: 'boyfriend' | 'girlfriend') => {
      const inc = incomes.filter(i => i.person === p).reduce((s, i) => s + i.amount, 0);
      const exp = expenses.filter(e => e.paidBy === p).reduce((s, e) => s + e.amount, 0);
      return { income: inc, expenses: exp, ratio: inc > 0 ? exp / inc : 0 };
    };
    return { boyfriend: calc('boyfriend'), girlfriend: calc('girlfriend') };
  }, [incomes, expenses]);

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

  const statusLabels: Record<ThermoStatus, string> = {
    ok: 'Todo bien',
    warm: 'Cuidado',
    hot: 'Al límite',
    danger: 'Excedido',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/15">
            <Thermometer className="h-5 w-5 text-primary" />
          </div>
          Gastómetro
        </h2>
      </div>

      <p className="text-sm text-muted-foreground">Compara tus gastos con tus ingresos</p>

      <Card className={`border-0 shadow-md overflow-hidden transition-all duration-500 ${
        status === 'ok' ? '' :
        status === 'warm' ? 'ring-2 ring-[hsl(var(--warning))]' :
        status === 'hot' ? 'ring-2 ring-orange-500 animate-pulse-glow' :
        'ring-2 ring-destructive animate-hell-shake'
      }`}>
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-[80px] mx-auto">
              <div className="relative h-40 rounded-full border-4 border-muted overflow-hidden bg-muted/30">
                <div
                  className={`absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out rounded-b-full ${
                    status === 'ok' ? 'bg-[hsl(var(--thermo-cool))]' :
                    status === 'warm' ? 'bg-[hsl(var(--thermo-warm))]' :
                    status === 'hot' ? 'bg-[hsl(var(--thermo-hot))] animate-flame-flicker' :
                    'bg-[hsl(var(--thermo-danger))]'
                  }`}
                  style={{ height: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <div className="mt-2 text-center">
                <span className={`text-2xl font-bold ${
                  status === 'ok' ? 'text-[hsl(var(--thermo-cool))]' :
                  status === 'warm' ? 'text-[hsl(var(--warning))]' :
                  status === 'hot' ? 'text-orange-500' :
                  'text-destructive'
                }`}>
                  {ratio <= 1 ? `${(ratio * 100).toFixed(0)}%` : '>100%'}
                </span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Gastos / Ingresos</p>
              <p className={`text-lg font-bold ${
                status === 'ok' ? 'text-accent' :
                status === 'warm' ? 'text-[hsl(var(--warning))]' :
                status === 'hot' ? 'text-orange-500' :
                'text-destructive'
              }`}>
                {statusLabels[status]}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-accent/10">
                <TrendingUp className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Ingresos</p>
                  <p className="font-bold">{fmt(totalIncome)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Gastos</p>
                  <p className="font-bold">{fmt(totalExpenses)}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {([{ p: 'boyfriend' as const, img: sheriffBoy }, { p: 'girlfriend' as const, img: sheriffGirl }]).map(({ p, img }) => {
          const d = byPerson[p];
          const s = getThermoStatus(d.ratio);
          return (
            <Card key={p} className="border-0 shadow-md">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <img src={img} alt="" className="h-6 w-6 rounded-full" />
                  <span className="text-sm font-semibold">{PERSON_NAMES[p]}</span>
                </div>
                <div className="space-y-0.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Ingresos</span><span>{fmt(d.income)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Gastos</span><span>{fmt(d.expenses)}</span></div>
                  <div className={`flex justify-between font-semibold ${s === 'danger' ? 'text-destructive' : s === 'hot' ? 'text-orange-500' : ''}`}>
                    <span>Ratio</span>
                    <span>{(d.ratio * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
