import { useState, useRef } from 'react';
import ExpenseForm from '@/components/ExpenseForm';
import Dashboard from '@/components/Dashboard';
import GoalsSection from '@/components/GoalsSection';
import IncomeSection from '@/components/IncomeSection';
import BudgetSection from '@/components/BudgetSection';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useCollection } from '@/hooks/useFirestore';
import { Expense, SavingsGoal, Income, Budget } from '@/lib/types';
import { orderBy } from 'firebase/firestore';
import { BarChart3, PlusCircle, Target, DollarSign, PieChart } from 'lucide-react';
import sheriffBoy from '@/assets/sheriff-boy.png';
import sheriffGirl from '@/assets/sheriff-girl.png';

const TABS = [
  { key: 'add', label: 'Agregar', icon: PlusCircle },
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'income', label: 'Ingresos', icon: DollarSign },
  { key: 'budgets', label: 'Presupuestos', icon: PieChart },
  { key: 'goals', label: 'Metas', icon: Target },
] as const;

type TabKey = typeof TABS[number]['key'];

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('add');
  const [avatarViewer, setAvatarViewer] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);

  const { data: expenses, loading: el, error: ee, add: addExpense, update: updateExpense, remove: removeExpense } =
    useCollection<Expense>('expenses', [orderBy('createdAt', 'desc')]);
  const { data: goals, loading: gl, error: ge, add: addGoal, update: updateGoal, remove: removeGoal } =
    useCollection<SavingsGoal>('goals', [orderBy('createdAt', 'desc')]);
  const { data: incomes, loading: il, error: ie, add: addIncome, remove: removeIncome } =
    useCollection<Income>('incomes', [orderBy('createdAt', 'desc')]);
  const { data: budgets, loading: bl, error: be, add: addBudget, remove: removeBudget } =
    useCollection<Budget>('budgets', [orderBy('createdAt', 'desc')]);

  const loading = el || gl || il || bl;
  const error = ee || ge || ie || be;

  const tabIndex = TABS.findIndex(t => t.key === activeTab);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 60) {
      const next = diff < 0 ? Math.min(tabIndex + 1, TABS.length - 1) : Math.max(tabIndex - 1, 0);
      setActiveTab(TABS[next].key);
    }
    touchStartX.current = null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin h-10 w-10 border-[3px] border-primary/30 border-t-primary rounded-full" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-destructive text-center">
          <AlertIcon />
          <p className="font-medium">Error al cargar datos.</p>
          <p className="text-sm text-muted-foreground">Revisa tu conexion y la configuracion de Firebase.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="glass sticky top-0 z-10 border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl gradient-primary">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold leading-tight tracking-tight">Sheriff de Gastos</h1>
              <p className="text-[10px] text-muted-foreground font-medium tracking-wide">Kevin & Angeles</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <img src={sheriffBoy} alt="Kevin" className="w-9 h-9 rounded-full ring-2 ring-primary/20 cursor-pointer transition-transform hover:scale-105" onClick={() => setAvatarViewer(sheriffBoy)} />
            <img src={sheriffGirl} alt="Angeles" className="w-9 h-9 rounded-full ring-2 ring-accent/20 cursor-pointer transition-transform hover:scale-105" onClick={() => setAvatarViewer(sheriffGirl)} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main
        className="flex-1 max-w-2xl mx-auto px-4 py-5 pb-24 w-full"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="transition-all duration-300 ease-out">
          {activeTab === 'add' && <ExpenseForm onExpenseAdded={addExpense} />}
          {activeTab === 'dashboard' && <Dashboard expenses={expenses} onUpdateExpense={updateExpense} onDeleteExpense={removeExpense} />}
          {activeTab === 'income' && <IncomeSection incomes={incomes} expenses={expenses} onAddIncome={addIncome} onRemoveIncome={removeIncome} />}
          {activeTab === 'budgets' && <BudgetSection budgets={budgets} expenses={expenses} onAddBudget={addBudget} onRemoveBudget={removeBudget} />}
          {activeTab === 'goals' && <GoalsSection goals={goals} onAddGoal={addGoal} onUpdateGoal={updateGoal} onRemoveGoal={removeGoal} />}
        </div>
      </main>

      {/* Bottom tab bar - iOS style */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t safe-area-pb z-20">
        <div className="max-w-2xl mx-auto flex">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 pt-2.5 transition-all duration-200 ${
                activeTab === key ? 'text-primary scale-105' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 transition-all ${activeTab === key ? 'drop-shadow-sm' : ''}`} strokeWidth={activeTab === key ? 2.5 : 1.8} />
              <span className={`text-[10px] ${activeTab === key ? 'font-bold' : 'font-medium'}`}>{label}</span>
              {activeTab === key && (
                <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Avatar viewer */}
      <Dialog open={!!avatarViewer} onOpenChange={() => setAvatarViewer(null)}>
        <DialogContent className="max-w-xs p-2 rounded-2xl">
          {avatarViewer && <img src={avatarViewer} alt="Avatar" className="w-full rounded-xl" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function AlertIcon() {
  return (
    <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export default Index;
