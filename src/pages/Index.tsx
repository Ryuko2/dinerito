import { useState, useRef, useEffect } from 'react';
import RegistrarGasto from '@/components/RegistrarGasto';
import Dashboard from '@/components/Dashboard';
import GoalsSection from '@/components/GoalsSection';
import IncomeSection from '@/components/IncomeSection';
import BudgetSection from '@/components/BudgetSection';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCollection } from '@/hooks/useFirestore';
import { Expense, SavingsGoal, Income, Budget } from '@/lib/types';
import { orderBy } from 'firebase/firestore';
import { BarChart3, PlusCircle, Target, DollarSign, PieChart, Settings2, Download, Upload, Thermometer, Languages } from 'lucide-react';
import BankHeader from '@/components/BankHeader';
import { toast } from 'sonner';
import sheriffBoy from '@/assets/sheriff-boy.png';
import sheriffGirl from '@/assets/sheriff-girl.png';
import {
  exportAllData,
  downloadBackup,
  importData,
} from '@/lib/persistence';
import { runLegacyMigration } from '@/lib/migrateLegacy';
import { sanitizeForFirestore } from '@/lib/utils';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import GastometerSection from '@/components/GastometerSection';
import { useI18n } from '@/lib/i18n';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

const TABS = [
  { key: 'add', label: 'Registrar Gasto', labelEn: 'Register Expense', icon: PlusCircle },
  { key: 'dashboard', label: 'Mi Libro', labelEn: 'My Ledger', icon: BarChart3 },
  { key: 'gastometer', label: 'Gastómetro', labelEn: 'Gastometer', icon: Thermometer },
  { key: 'income', label: 'Depósitos', labelEn: 'Deposits', icon: DollarSign },
  { key: 'budgets', label: 'Asignación', labelEn: 'Allowance', icon: PieChart },
  { key: 'goals', label: 'Metas', labelEn: 'Goals', icon: Target },
] as const;

type TabKey = typeof TABS[number]['key'];

const Index = () => {
  const { locale, setLocale, t } = useI18n();
  const isOnline = useConnectionStatus();
  const [activeTab, setActiveTab] = useState<TabKey>('add');
  const [avatarViewer, setAvatarViewer] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // One-time migration: recover data from old localStorage keys
  useEffect(() => {
    runLegacyMigration().then((didMigrate) => {
      if (didMigrate) toast.success('Datos recuperados correctamente.');
    });
  }, []);

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

  const handleExport = () => {
    const backup = exportAllData({ expenses, goals, incomes, budgets });
    downloadBackup(backup);
    toast.success('Respaldo descargado.');
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = importData(text);
        if (!data) {
          toast.error('Archivo no válido.');
          return;
        }
        let count = 0;
        for (const e of data.expenses) {
          const item = e as Record<string, unknown>;
          if (!item || typeof item !== 'object') continue;
          const { id: _id, ...rest } = item;
          await addDoc(collection(db, 'expenses'), sanitizeForFirestore({
            ...rest,
            schemaVersion: '1.0',
            createdAt: rest.createdAt ? new Date(String(rest.createdAt)) : serverTimestamp(),
          }));
          count++;
        }
        for (const g of data.goals) {
          const item = g as Record<string, unknown>;
          if (!item || typeof item !== 'object') continue;
          const { id: _id, ...rest } = item;
          await addDoc(collection(db, 'goals'), sanitizeForFirestore({
            ...rest,
            schemaVersion: '1.0',
            createdAt: rest.createdAt ? new Date(String(rest.createdAt)) : serverTimestamp(),
          }));
          count++;
        }
        for (const i of data.incomes || []) {
          const item = i as Record<string, unknown>;
          if (!item || typeof item !== 'object') continue;
          const { id: _id, ...rest } = item;
          await addDoc(collection(db, 'incomes'), sanitizeForFirestore({
            ...rest,
            schemaVersion: '1.0',
            createdAt: rest.createdAt ? new Date(String(rest.createdAt)) : serverTimestamp(),
          }));
          count++;
        }
        for (const b of data.budgets || []) {
          const item = b as Record<string, unknown>;
          if (!item || typeof item !== 'object') continue;
          const { id: _id, ...rest } = item;
          await addDoc(collection(db, 'budgets'), sanitizeForFirestore({
            ...rest,
            schemaVersion: '1.0',
            createdAt: rest.createdAt ? new Date(String(rest.createdAt)) : serverTimestamp(),
          }));
          count++;
        }
        toast.success(`Datos restaurados: ${count} registros.`);
      } catch (err) {
        console.error(err);
        toast.error('Error al importar.');
      }
    };
    input.click();
  };

  const tabIndex = TABS.findIndex(t => t.key === activeTab);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    const isInteractiveElement = target.closest('input, textarea, select, button, a, [role="button"], [data-radix-collection-item]');
    if (isInteractiveElement) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;
    const isHorizontalSwipe = Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.5;
    if (isHorizontalSwipe) {
      const next = diffX < 0 ? Math.min(tabIndex + 1, TABS.length - 1) : Math.max(tabIndex - 1, 0);
      setActiveTab(TABS[next].key);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5ECD7] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
          <div className="text-copper font-serif font-bold text-2xl tracking-wide text-center" style={{ fontFamily: "'Playfair Display', serif" }}>
            Dinerito
          </div>
          <div className="text-copper/80 animate-pulse">★</div>
          <div className="animate-spin h-8 w-8 border-2 border-copper/30 border-t-copper rounded-full" />
        </div>
      </div>
    );
  }

  const hasAnyData = expenses.length > 0 || goals.length > 0 || incomes.length > 0 || budgets.length > 0;
  if (error && !hasAnyData) {
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
    <div className="h-screen h-[100dvh] max-h-[100dvh] bg-background flex flex-col overflow-hidden">
      {!isOnline && (
        <div className="bg-destructive/15 text-destructive text-center py-1.5 text-xs font-medium px-4 flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse shrink-0" />
          Sin conexión — los datos se sincronizarán cuando vuelva la conexión
        </div>
      )}
      {isOnline && error && hasAnyData && (
        <div className="bg-amber-500/15 text-amber-800 dark:text-amber-200 text-center py-1.5 text-xs font-medium px-4">
          Mostrando datos guardados. Revisa tu conexión para sincronizar con la nube.
        </div>
      )}
      {/* Header */}
      <header className="glass sticky top-0 z-10 border-b border-copper/30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <BankHeader />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <Settings2 className="h-5 w-5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2 border-copper/30 bg-[#F5ECD7]" align="end">
                <p className="text-xs font-semibold text-copper uppercase tracking-wider px-2 py-1 mb-1">Preferencias del Banco</p>
                <div className="space-y-1">
                  <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}>
                    <Languages className="h-4 w-4" /> {locale === 'es' ? 'English' : 'Español'}
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleExport}>
                    <Download className="h-4 w-4" /> {t('exportData')}
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleImport}>
                    <Upload className="h-4 w-4" /> {t('importData')}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <img src={sheriffBoy} alt="Kevin" className="w-9 h-9 rounded-full ring-2 ring-primary/20 cursor-pointer transition-transform hover:scale-105" onClick={() => setAvatarViewer(sheriffBoy)} />
            <img src={sheriffGirl} alt="Angeles" className="w-9 h-9 rounded-full ring-2 ring-accent/20 cursor-pointer transition-transform hover:scale-105" onClick={() => setAvatarViewer(sheriffGirl)} />
          </div>
        </div>
      </header>

      {/* Content - ledger scrollable area */}
      <main
        className="flex-1 min-h-0 max-w-2xl mx-auto px-4 py-5 pb-24 w-full overflow-y-auto overflow-x-hidden overscroll-contain bg-ledger"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        <div className="transition-all duration-300 ease-out">
          {activeTab === 'add' && (
            <RegistrarGasto
              onExpenseAdded={addExpense}
              onNavigateToLedger={() => setActiveTab('dashboard')}
            />
          )}
          {activeTab === 'dashboard' && <Dashboard expenses={expenses} incomes={incomes} onUpdateExpense={updateExpense} onDeleteExpense={removeExpense} />}
          {activeTab === 'gastometer' && <GastometerSection expenses={expenses} incomes={incomes} />}
          {activeTab === 'income' && <IncomeSection incomes={incomes} expenses={expenses} onAddIncome={addIncome} onRemoveIncome={removeIncome} />}
          {activeTab === 'budgets' && <BudgetSection budgets={budgets} expenses={expenses} onAddBudget={addBudget} onRemoveBudget={removeBudget} />}
          {activeTab === 'goals' && <GoalsSection goals={goals} onAddGoal={addGoal} onUpdateGoal={updateGoal} onRemoveGoal={removeGoal} />}
        </div>
      </main>

      {/* Bottom tab bar - brass plaques style */}
      <nav className="fixed bottom-0 left-0 right-0 safe-area-pb z-20" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)', background: 'linear-gradient(180deg, #3D2010 0%, #2C1A0E 100%)', borderTop: '2px solid #C87941' }}>
        <div className="max-w-2xl mx-auto flex">
          {TABS.map(({ key, label, labelEn, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 pt-2.5 px-1 mx-0.5 rounded-lg transition-all duration-150 select-none ${
                activeTab === key
                  ? 'bg-copper/25 border border-copper text-copper'
                  : 'bg-copper/10 border border-copper/30 text-[#E8D5B0]/80'
              }`}
            >
              <Icon className={`h-5 w-5 transition-colors ${activeTab === key ? 'drop-shadow-sm' : ''}`} strokeWidth={activeTab === key ? 2.5 : 1.8} />
              <span className={`text-[10px] ${activeTab === key ? 'font-bold' : 'font-medium'}`}>{locale === 'es' ? label : labelEn}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Avatar viewer */}
      <Dialog open={!!avatarViewer} onOpenChange={() => setAvatarViewer(null)}>
        <DialogContent className="max-w-xs p-2 rounded-2xl" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Ver avatar</DialogTitle>
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
