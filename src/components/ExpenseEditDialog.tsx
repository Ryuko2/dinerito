import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Expense, CATEGORIES, CARDS, Person, PERSON_NAMES, PaymentType } from '@/lib/types';
import CategoryIcon from '@/components/CategoryIcon';
import { toast } from 'sonner';

interface Props {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, data: Partial<Expense>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function ExpenseEditDialog({ expense, open, onOpenChange, onUpdate, onDelete }: Props) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [card, setCard] = useState('');
  const [brand, setBrand] = useState('');
  const [paidBy, setPaidBy] = useState<Person>('boyfriend');
  const [date, setDate] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('');
  const [saving, setSaving] = useState(false);

  // Sync state when expense changes
  const prevId = useState<string | null>(null);
  if (expense && expense.id !== prevId[0]) {
    prevId[1](expense.id);
    setAmount(String(expense.amount));
    setDescription(expense.description);
    setCategory(expense.category);
    setCard(expense.card);
    setBrand(expense.brand || '');
    setPaidBy(expense.paidBy);
    setDate(expense.date);
    setPaymentType(expense.paymentType || '');
  }

  if (!expense) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(expense.id, {
        amount: parseFloat(amount),
        description: description.trim(),
        category,
        card,
        brand: brand.trim(),
        paidBy,
        date,
        paymentType: paymentType || undefined,
      });
      toast.success('Gasto actualizado.');
      onOpenChange(false);
    } catch {
      toast.error('Error al actualizar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(expense.id);
      toast.success('Gasto eliminado.');
      onOpenChange(false);
    } catch {
      toast.error('Error al eliminar.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Gasto</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Monto</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fecha</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Descripcion</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>
                      <span className="flex items-center gap-2"><CategoryIcon category={c} className="h-3 w-3" />{c}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tarjeta</Label>
              <Select value={card} onValueChange={setCard}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CARDS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Pagado por</Label>
              <Select value={paidBy} onValueChange={v => setPaidBy(v as Person)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boyfriend">{PERSON_NAMES.boyfriend}</SelectItem>
                  <SelectItem value="girlfriend">{PERSON_NAMES.girlfriend}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo de pago</Label>
              <Select value={paymentType || 'none'} onValueChange={v => setPaymentType(v === 'none' ? '' : v as PaymentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="credito">Credito</SelectItem>
                  <SelectItem value="debito">Debito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Marca / Tienda</Label>
            <Input value={brand} onChange={e => setBrand(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
