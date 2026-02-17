import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ExpenseForm from '@/components/ExpenseForm';
import Dashboard from '@/components/Dashboard';
import GoalsSection from '@/components/GoalsSection';
import { getExpenses, getGoals } from '@/lib/storage';
import { Expense, SavingsGoal } from '@/lib/types';
import { BarChart3, PlusCircle, Target } from 'lucide-react';
import sheriffBoy from '@/assets/sheriff-boy.png';
import sheriffGirl from '@/assets/sheriff-girl.png';

const Index = () => {
  const [expenses, setExpenses] = useState<Expense[]>(getExpenses);
  const [goals, setGoals] = useState<SavingsGoal[]>(getGoals);

  const refresh = useCallback(() => {
    setExpenses(getExpenses());
    setGoals(getGoals());
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤠</span>
            <div>
              <h1 className="text-lg font-extrabold leading-tight">Sheriff de Gastos</h1>
              <p className="text-[11px] text-muted-foreground">Controlamos la lana juntos 💰</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <img src={sheriffBoy} alt="Él" className="w-9 h-9 rounded-full ring-2 ring-primary/30" />
            <img src={sheriffGirl} alt="Ella" className="w-9 h-9 rounded-full ring-2 ring-accent/30" />
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
            <ExpenseForm onExpenseAdded={refresh} />
          </TabsContent>

          <TabsContent value="dashboard">
            <Dashboard expenses={expenses} />
          </TabsContent>

          <TabsContent value="goals">
            <GoalsSection goals={goals} onUpdate={refresh} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
