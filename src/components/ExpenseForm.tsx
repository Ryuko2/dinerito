import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { saveExpense } from '@/lib/storage';
import { CATEGORIES, CARDS, Person, PERSON_NAMES } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import sheriffBoy from '@/assets/sheriff-boy.png';
import sheriffGirl from '@/assets/sheriff-girl.png';

interface Props {
  onExpenseAdded: () => void;
}

export default function ExpenseForm({ onExpenseAdded }: Props) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [card, setCard] = useState('');
  const [brand, setBrand] = useState('');
  const [paidBy, setPaidBy] = useState<Person | ''>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !category || !card || !paidBy) {
      toast.error('¡Llena todos los campos obligatorios, vaquero! 🤠');
      return;
    }
    saveExpense({
      id: crypto.randomUUID(),
      amount: parseFloat(amount),
      description: description.trim().slice(0, 200),
      category,
      card,
      brand: brand.trim().slice(0, 100),
      paidBy: paidBy as Person,
      date,
      createdAt: new Date().toISOString(),
    });
    toast.success('¡Gasto registrado! 🌵');
    setAmount(''); setDescription(''); setCategory(''); setCard(''); setBrand(''); setPaidBy('');
    onExpenseAdded();
  };

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <PlusCircle className="h-5 w-5 text-primary" />
          Registrar Gasto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Who paid */}
          <div className="space-y-2">
            <Label>¿Quién pagó?</Label>
            <div className="flex gap-3">
              {([
                { value: 'boyfriend' as Person, img: sheriffBoy, label: `${PERSON_NAMES.boyfriend} 🤠` },
                { value: 'girlfriend' as Person, img: sheriffGirl, label: `${PERSON_NAMES.girlfriend} 🤠` },
              ]).map(({ value, img, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaidBy(value)}
                  className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    paidBy === value
                      ? 'border-primary bg-primary/10 shadow-md'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <img src={img} alt={label} className="w-12 h-12 rounded-full" />
                  <span className="text-sm font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Monto (MXN)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="9999999"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input placeholder="¿En qué se gastó?" value={description} onChange={e => setDescription(e.target.value)} maxLength={200} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tarjeta / Método</Label>
              <Select value={card} onValueChange={setCard}>
                <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent>
                  {CARDS.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: c.color }} />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Marca / Tienda (opcional)</Label>
            <Input placeholder="Ej: Oxxo, Amazon, Liverpool..." value={brand} onChange={e => setBrand(e.target.value)} maxLength={100} />
          </div>

          <Button type="submit" className="w-full text-base font-bold">
            Registrar Gasto 🌵
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
