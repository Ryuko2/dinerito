import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ExpenseForm from '@/components/ExpenseForm';
import Dashboard from '@/components/Dashboard';
import GoalsSection from '@/components/GoalsSection';
import { useCollection } from '@/hooks/useFirestore';
import { Expense, SavingsGoal } from '@/lib/types';
import { orderBy } from 'firebase/firestore';
import { BarChart3, PlusCircle, Target } from 'lucide-react';
import sheriffBoy from '@/assets/sheriff-boy.png';
import sheriffGirl from '@/assets/sheriff-girl.png';

const Index = () => {
  const {
    data: expenses,
    loading: expensesLoading,
    error: expensesError,
    add: addExpense,
  } = useCollection<Expense>('expenses', [orderBy('createdAt', 'desc')]);

  const {
    data: goals,
    loading: goalsLoading,
    error: goalsError,
    add: addGoal,
    update: updateGoal,
    remove: removeGoal,
  } = useCollection<SavingsGoal>('goals', [orderBy('createdAt', 'desc')]);

  const loading = expensesLoading || goalsLoading;
  const error = expensesError || goalsError;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-bounce text-5xl">🤠</div>
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-destructive text-center">
          <span className="text-4xl">⚠️</span>
          <p className="font-medium">Error al cargar datos.</p>
          <p className="text-sm text-muted-foreground">Revisa tu conexión y la configuración de Firebase.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤠</span>
            <div>
              <h1 className="text-lg font-extrabold leading-tight">Sheriff de Gastos</h1>
              <p className="text-[11px] text-muted-foreground">Kevin & Ángeles 💰</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <img src={sheriffBoy} alt="Kevin" className="w-9 h-9 rounded-full ring-2 ring-primary/30" />
            <img src={sheriffGirl} alt="Ángeles" className="w-9 h-9 rounded-full ring-2 ring-accent/30" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-4 pb-8">
        <Tabs defaultValue="add" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="add" className="text-xs sm:text-sm">
              <PlusCircle className="h-3.5 w-3.5 mr-1" /> Agregar
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5 mr-1" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="goals" className="text-xs sm:text-sm">
              <Target className="h-3.5 w-3.5 mr-1" /> Metas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add">
            <ExpenseForm onExpenseAdded={addExpense} />
          </TabsContent>

          <TabsContent value="dashboard">
            <Dashboard expenses={expenses} />
          </TabsContent>

          <TabsContent value="goals">
            <GoalsSection
              goals={goals}
              onAddGoal={addGoal}
              onUpdateGoal={updateGoal}
              onRemoveGoal={removeGoal}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
