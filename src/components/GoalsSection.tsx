import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SavingsGoal, GOAL_ICONS } from '@/lib/types';
import { Target, Plus, Trash2, PiggyBank } from 'lucide-react';
import CategoryIcon from '@/components/CategoryIcon';
import { toast } from 'sonner';

type AddGoalFn = (item: { name: string; targetAmount: number; currentAmount: number; icon: string; }) => Promise<unknown>;
type UpdateGoalFn = (id: string, updates: Partial<SavingsGoal>) => Promise<void>;
type RemoveGoalFn = (id: string) => Promise<void>;

interface Props {
  goals: SavingsGoal[];
  onAddGoal: AddGoalFn;
  onUpdateGoal: UpdateGoalFn;
  onRemoveGoal: RemoveGoalFn;
}

export default function GoalsSection({ goals, onAddGoal, onUpdateGoal, onRemoveGoal }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [icon, setIcon] = useState('Target');
  const [addAmountId, setAddAmountId] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

  const handleCreate = async () => {
    if (!name.trim() || !target) return;
    setSubmitting(true);
    try {
      await onAddGoal({ name: name.trim().slice(0, 100), targetAmount: parseFloat(target), currentAmount: 0, icon });
      toast.success('Meta creada.');
      setName(''); setTarget(''); setIcon('Target'); setOpen(false);
    } catch { toast.error('Error al crear meta.'); }
    finally { setSubmitting(false); }
  };

  const handleAddSavings = async (goalId: string) => {
    if (!addAmount || parseFloat(addAmount) <= 0) return;
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    try {
      await onUpdateGoal(goalId, { currentAmount: goal.currentAmount + parseFloat(addAmount) });
      toast.success('Ahorro agregado.');
      setAddAmountId(null); setAddAmount('');
    } catch { toast.error('Error al abonar.'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2 font-serif text-copper" style={{ fontFamily: "'Playfair Display', serif" }}>
          <Target className="h-5 w-5 text-copper" /> Metas de Ahorro
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-copper hover:bg-copper/90"><Plus className="h-4 w-4 mr-1" /> Nueva</Button></DialogTrigger>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader><DialogTitle>Nueva Meta</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Icono</Label>
                <div className="flex gap-2 flex-wrap">
                  {GOAL_ICONS.map(i => (
                    <button key={i} type="button" onClick={() => setIcon(i)}
                      className={`p-2 rounded-lg transition-all ${icon === i ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-muted'}`}>
                      <CategoryIcon iconName={i} className="h-5 w-5" />
                    </button>
                  ))}
                </div>
              </div>
              <div><Label>Nombre</Label><Input placeholder="Ej: Carro nuevo" value={name} onChange={e => setName(e.target.value)} maxLength={100} /></div>
              <div><Label>Monto objetivo (MXN)</Label><Input type="number" step="0.01" min="0" placeholder="0.00" value={target} onChange={e => setTarget(e.target.value)} /></div>
              <Button onClick={handleCreate} className="w-full" disabled={submitting}>{submitting ? 'Creando...' : 'Crear Meta'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <PiggyBank className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-copper/80">Sin metas de ahorro</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {goals.map(goal => {
            const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            return (
              <Card key={goal.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CategoryIcon iconName={goal.icon} className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-bold">{goal.name}</p>
                        <p className="text-xs text-muted-foreground">{fmt(goal.currentAmount)} / {fmt(goal.targetAmount)}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => onRemoveGoal(goal.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  <Progress value={pct} className="h-3 mb-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary">{pct.toFixed(0)}%</span>
                    {addAmountId === goal.id ? (
                      <div className="flex gap-1.5">
                        <Input type="number" step="0.01" min="0" placeholder="$" value={addAmount} onChange={e => setAddAmount(e.target.value)} className="w-24 h-8 text-sm" />
                        <Button size="sm" className="h-8" onClick={() => handleAddSavings(goal.id)}>+</Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setAddAmountId(null)}>x</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddAmountId(goal.id)}>Abonar</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
