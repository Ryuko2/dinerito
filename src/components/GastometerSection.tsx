import { useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Expense, Income, SavingsGoal, Budget, Debt, RecurringExpense, PERSON_NAMES } from '@/lib/types';
import { Thermometer, TrendingUp, TrendingDown, Target, PieChart, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { useFormatCurrency } from '@/lib/settings';
import { useI18n } from '@/lib/i18n';
import sheriffBoy from '@/assets/sheriff-boy.png';
import sheriffGirl from '@/assets/sheriff-girl.png';

type ThermoStatus = 'ok' | 'warm' | 'hot' | 'danger';
type DateRange = 'week' | 'month' | 'year' | 'custom';

interface Props {
  expenses: Expense[];
  incomes: Income[];
  goals: SavingsGoal[];
  budgets: Budget[];
  debts: Debt[];
  recurring: RecurringExpense[];
}

function getThermoStatus(ratio: number): ThermoStatus {
  if (ratio <= 0.5) return 'ok';
  if (ratio <= 0.8) return 'warm';
  if (ratio <= 1) return 'hot';
  return 'danger';
}

// Animated number counter hook
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);
  const valueRef = useRef(0);
  valueRef.current = value;
  useEffect(() => {
    if (prevTarget.current === target) return;
    const from = valueRef.current;
    prevTarget.current = target;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(from + (target - from) * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target]);
  return value;
}

function AnimatedBar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.min(pct, 100)), delay + 100);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}

function getDateRange(range: DateRange, customFrom?: string, customTo?: string) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  if (range === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - 7);
    return { from: start.toISOString().split('T')[0], to: today };
  }
  if (range === 'month') {
    return { from: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`, to: today };
  }
  if (range === 'year') {
    return { from: `${now.getFullYear()}-01-01`, to: today };
  }
  return { from: customFrom || today, to: customTo || today };
}

function countOccurrences(rec: RecurringExpense, from: string, to: string): number {
  const start = new Date(Math.max(new Date(rec.startDate).getTime(), new Date(from).getTime()));
  const end = new Date(to);
  if (start > end) return 0;
  const days = (end.getTime() - start.getTime()) / 86400000;
  if (rec.frequency === 'weekly') return Math.floor(days / 7) + 1;
  if (rec.frequency === 'biweekly') return Math.floor(days / 15) + 1;
  return Math.floor(days / 30) + 1;
}

export default function GastometerSection({ expenses, incomes, goals, budgets, debts, recurring }: Props) {
  const { t, locale } = useI18n();
  const fmt = useFormatCurrency();
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showBudgets, setShowBudgets] = useState(true);
  const [showGoals, setShowGoals] = useState(true);
  const [showPredictions, setShowPredictions] = useState(true);

  const { from, to } = getDateRange(dateRange, customFrom, customTo);

  const filtered = useMemo(() => {
    const exp = expenses.filter(e => e.date >= from && e.date <= to);
    const inc = incomes.filter(i => i.date >= from && i.date <= to);
    const totalExp = exp.reduce((s, e) => s + e.amount, 0);
    const totalInc = inc.reduce((s, i) => s + i.amount, 0);
    return { exp, inc, totalExp, totalInc };
  }, [expenses, incomes, from, to]);

  const recurringTotal = useMemo(() => {
    return recurring
      .filter(r => r.active)
      .reduce((s, r) => s + r.amount * countOccurrences(r, from, to), 0);
  }, [recurring, from, to]);

  const totalDebtRemaining = useMemo(() =>
    debts.reduce((s, d) => s + (d.totalAmount - d.amountPaid), 0),
  [debts]);

  const totalCombinedExpenses = filtered.totalExp + recurringTotal;
  const ratio = filtered.totalInc > 0 ? totalCombinedExpenses / filtered.totalInc : 0;
  const status = getThermoStatus(ratio);
  const pct = Math.min(ratio * 100, 120);

  const animIncome = useCountUp(filtered.totalInc);
  const animExpenses = useCountUp(totalCombinedExpenses);
  const animDebt = useCountUp(totalDebtRemaining);

  const predictions = useMemo(() => {
    const days = Math.max(1, (new Date(to).getTime() - new Date(from).getTime()) / 86400000);
    const dailySpend = filtered.totalExp / days;
    const dailyIncome = filtered.totalInc / days;

    const proj30days = dailySpend * 30;
    const proj30income = dailyIncome * 30;
    const recurringMonthly = recurring
      .filter(r => r.active)
      .reduce((s, r) => {
        if (r.frequency === 'monthly') return s + r.amount;
        if (r.frequency === 'biweekly') return s + r.amount * 2;
        return s + r.amount * 4.33;
      }, 0);

    const budgetPredictions = budgets.map(b => {
      const periodDays = b.period === 'weekly' ? 7 : b.period === 'biweekly' ? 15 : 30;
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - periodDays);
      const cutStr = cutoff.toISOString().split('T')[0];
      const exp = expenses.filter(e => {
        if (e.date < cutStr) return false;
        if (b.category !== 'all' && e.category !== b.category) return false;
        if (b.person !== 'all' && e.paidBy !== b.person) return false;
        return true;
      });
      const spent = exp.reduce((s, e) => s + e.amount, 0);
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const daysElapsed = Math.max(1, (Date.now() - monthStart.getTime()) / 86400000);
      const projectedTotal = (spent / daysElapsed) * periodDays;
      const willExceed = projectedTotal > b.limitAmount;
      const projectedPct = (projectedTotal / b.limitAmount) * 100;
      return { ...b, spent, projectedTotal, projectedPct, willExceed };
    });

    const goalPredictions = goals.map(g => {
      const remaining = g.targetAmount - g.currentAmount;
      const monthlySavings = proj30income - proj30days - recurringMonthly;
      const monthsToComplete = monthlySavings > 0 ? remaining / monthlySavings : null;
      const canAchieve = monthlySavings > 0 && monthsToComplete !== null;
      const completionDate = canAchieve && monthsToComplete
        ? new Date(Date.now() + monthsToComplete * 30 * 86400000)
        : null;
      return { ...g, remaining, monthlySavings, monthsToComplete, canAchieve, completionDate };
    });

    return {
      proj30days,
      proj30income,
      recurringMonthly,
      netMonthly: proj30income - proj30days - recurringMonthly,
      budgetPredictions,
      goalPredictions,
    };
  }, [expenses, incomes, budgets, goals, recurring, from, to, filtered]);

  const byPerson = useMemo(() => {
    const calc = (p: 'boyfriend' | 'girlfriend') => {
      const inc = incomes.filter(i => i.person === p && i.date >= from && i.date <= to).reduce((s, i) => s + i.amount, 0);
      const exp = expenses.filter(e => e.paidBy === p && e.date >= from && e.date <= to).reduce((s, e) => s + e.amount, 0);
      const recExp = recurring.filter(r => r.active && (r.person === p || r.person === 'all'))
        .reduce((s, r) => s + r.amount * countOccurrences(r, from, to), 0);
      return { income: inc, expenses: exp + recExp, ratio: inc > 0 ? (exp + recExp) / inc : 0 };
    };
    return { boyfriend: calc('boyfriend'), girlfriend: calc('girlfriend') };
  }, [incomes, expenses, recurring, from, to]);

  const statusColors = {
    ok: 'text-emerald-500', warm: 'text-yellow-500', hot: 'text-orange-500', danger: 'text-destructive'
  };
  const statusLabels = { ok: t('statusOk'), warm: t('statusWarm'), hot: t('statusHot'), danger: t('statusDanger') };
  const barColors = { ok: '#10b981', warm: '#f59e0b', hot: '#f97316', danger: '#ef4444' };

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/15">
            <Thermometer className="h-5 w-5 text-primary" />
          </div>
          {t('gastometer')}
        </h2>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {(['week','month','year','custom'] as DateRange[]).map(r => (
          <button
            key={r}
            onClick={() => setDateRange(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              dateRange === r
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border text-muted-foreground hover:border-primary/40'
            }`}
          >
            {r === 'week' ? t('dateRange7Days') : r === 'month' ? t('dateRangeThisMonth') : r === 'year' ? t('dateRangeThisYear') : t('dateRangeCustom')}
          </button>
        ))}
      </div>
      {dateRange === 'custom' && (
        <div className="flex gap-2">
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
            className="flex-1 p-2 rounded-lg border border-border text-sm bg-background" />
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
            className="flex-1 p-2 rounded-lg border border-border text-sm bg-background" />
        </div>
      )}

      <Card className={`border-0 shadow-md overflow-hidden transition-all duration-500 ${
        status === 'hot' ? 'ring-2 ring-orange-500' :
        status === 'danger' ? 'ring-2 ring-destructive animate-hell-shake' : ''
      }`}>
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-[80px] mx-auto">
              <ThermoFill pct={pct} status={status} />
              <div className="mt-2 text-center">
                <span className={`text-2xl font-bold ${statusColors[status]}`}>
                  {ratio <= 1 ? `${(ratio * 100).toFixed(0)}%` : '>100%'}
                </span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">{t('spendingRatio')}</p>
              <p className={`text-lg font-bold ${statusColors[status]}`}>{statusLabels[status]}</p>
              {recurringTotal > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('includesRecurring')} {fmt(recurringTotal)}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-accent/10">
                <TrendingUp className="h-5 w-5 text-accent shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">{t('incomeLabel')}</p>
                  <p className="font-bold text-sm">{fmt(animIncome)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">{t('expensesLabel')}</p>
                  <p className="font-bold text-sm">{fmt(animExpenses)}</p>
                </div>
              </div>
            </div>
            {totalDebtRemaining > 0 && (
              <div className="w-full p-3 rounded-xl bg-orange-500/10 flex items-center gap-2">
                <span className="text-orange-500 text-lg">⚠️</span>
                <div>
                  <p className="text-xs text-muted-foreground">{t('totalDebtPending')}</p>
                  <p className="font-bold text-orange-500">{fmt(animDebt)}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {([{ p: 'boyfriend' as const, img: sheriffBoy }, { p: 'girlfriend' as const, img: sheriffGirl }]).map(({ p, img }) => {
          const d = byPerson[p];
          const s = getThermoStatus(d.ratio);
          return (
            <Card key={p} className="border-0 shadow-sm">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <img src={img} alt="" className="h-6 w-6 rounded-full" />
                  <span className="text-sm font-semibold">{PERSON_NAMES[p]}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t('incomeLabel')}</span><span>{fmt(d.income)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t('expensesLabel')}</span><span>{fmt(d.expenses)}</span></div>
                  <AnimatedBar pct={d.ratio * 100} color={barColors[s]} />
                  <div className={`text-right font-semibold ${statusColors[s]}`}>{(d.ratio * 100).toFixed(0)}%</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {budgets.length > 0 && (
        <div>
          <button
            onClick={() => setShowBudgets(v => !v)}
            className="w-full flex items-center justify-between py-3 font-bold text-sm"
          >
            <span className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              {t('budgetPredictions')}
            </span>
            {showBudgets ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showBudgets && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              {predictions.budgetPredictions.map((b, i) => (
                <Card key={b.id} className="border-0 shadow-sm">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-sm">{b.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('spent')}: {fmt(b.spent)} / {fmt(b.limitAmount)}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        b.willExceed ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'
                      }`}>
                        {b.willExceed ? t('willExceed') : '✓ OK'}
                      </span>
                    </div>
                    <AnimatedBar
                      pct={b.projectedPct}
                      color={b.willExceed ? '#ef4444' : b.projectedPct > 80 ? '#f59e0b' : '#10b981'}
                      delay={i * 100}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {t('projectedEndPeriod')}: {fmt(b.projectedTotal)} ({b.projectedPct.toFixed(0)}%)
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {goals.length > 0 && (
        <div>
          <button
            onClick={() => setShowGoals(v => !v)}
            className="w-full flex items-center justify-between py-3 font-bold text-sm"
          >
            <span className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              {t('goalPredictions')}
            </span>
            {showGoals ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showGoals && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              {predictions.goalPredictions.map((g, i) => {
                const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100);
                return (
                  <Card key={g.id} className="border-0 shadow-sm">
                    <CardContent className="pt-3 pb-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-sm">{g.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {fmt(g.currentAmount)} / {fmt(g.targetAmount)}
                          </p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          g.canAchieve ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'
                        }`}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <AnimatedBar pct={pct} color="#10b981" delay={i * 100} />
                      <div className="mt-2 text-xs">
                        {g.canAchieve && g.completionDate ? (
                          <p className="text-accent flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {t('goalAchievableBy')} {g.completionDate.toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', { month: 'long', year: 'numeric' })}
                            {g.monthsToComplete && ` (~${Math.ceil(g.monthsToComplete)} ${t('months')})`}
                          </p>
                        ) : (
                          <p className="text-muted-foreground">
                            {g.monthlySavings <= 0
                              ? t('noSavingsForGoal')
                              : `${t('estimatedMonthlySavings')}: ${fmt(g.monthlySavings)}`}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showPredictions && (
        <div>
          <button
            onClick={() => setShowPredictions(v => !v)}
            className="w-full flex items-center justify-between py-3 font-bold text-sm"
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {t('monthlyFlowProjected')}
            </span>
            {showPredictions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-4 space-y-3">
              <FlowRow label={t('projectedIncome')} value={predictions.proj30income} positive fmt={fmt} />
              <FlowRow label={t('projectedExpenses')} value={-predictions.proj30days} fmt={fmt} />
              <FlowRow label={t('recurringExpenses')} value={-predictions.recurringMonthly} fmt={fmt} />
              <div className="border-t border-border pt-2">
                <FlowRow
                  label={t('netMonthlyFlow')}
                  value={predictions.netMonthly}
                  positive={predictions.netMonthly > 0}
                  bold
                  fmt={fmt}
                />
              </div>
              {predictions.netMonthly > 0 && (
                <p className="text-xs text-accent">
                  ✓ {t('couldSaveMonthly')} {fmt(predictions.netMonthly)}
                </p>
              )}
              {predictions.netMonthly <= 0 && (
                <p className="text-xs text-destructive">
                  ⚠️ {t('expensesExceedIncome')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ThermoFill({ pct, status }: { pct: number; status: ThermoStatus }) {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setHeight(Math.min(pct, 100)), 200);
    return () => clearTimeout(t);
  }, [pct]);
  const colors = { ok: '#3b82f6', warm: '#f59e0b', hot: '#f97316', danger: '#ef4444' };
  return (
    <div className="relative h-40 rounded-full border-4 border-muted overflow-hidden bg-muted/30">
      <div
        className="absolute bottom-0 left-0 right-0 rounded-b-full transition-all duration-700 ease-out"
        style={{ height: `${height}%`, backgroundColor: colors[status] }}
      />
    </div>
  );
}

function FlowRow({ label, value, positive, bold, fmt }: {
  label: string; value: number; positive?: boolean; bold?: boolean; fmt: (n: number) => string
}) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const from = 0;
    const to = value;
    const tick = () => {
      const p = Math.min((Date.now() - start) / 600, 1);
      const eased = 1 - Math.pow(2, -10 * p);
      setDisplayed(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return (
    <div className={`flex justify-between items-center text-sm ${bold ? 'font-bold' : ''}`}>
      <span className={bold ? '' : 'text-muted-foreground'}>{label}</span>
      <span className={positive ? 'text-accent' : value < 0 ? 'text-destructive' : ''}>
        {fmt(Math.abs(displayed))}
      </span>
    </div>
  );
}
