import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { CATEGORIES, CARDS, Person, PERSON_NAMES, PaymentType } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import CategoryIcon from '@/components/CategoryIcon';
import sheriffBoy from '@/assets/sheriff-boy.png';
import sheriffGirl from '@/assets/sheriff-girl.png';

type AddExpenseFn = (item: {
  amount: number;
  description: string;
  category: string;
  card: string;
  brand: string;
  paidBy: Person;
  date: string;
  paymentType?: PaymentType;
  thirdPartyName?: string;
}) => Promise<unknown>;

interface Props {
  onExpenseAdded: AddExpenseFn;
}

export default function ExpenseForm({ onExpenseAdded }: Props) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [card, setCard] = useState('');
  const [brand, setBrand] = useState('');
  const [paidBy, setPaidBy] = useState<Person | ''>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState<PaymentType>('');
  const [isThirdParty, setIsThirdParty] = useState(false);
  const [thirdPartyName, setThirdPartyName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !category || !card || !paidBy) {
      toast.error('Completa los campos obligatorios.');
      return;
    }
    setSubmitting(true);
    try {
      await onExpenseAdded({
        amount: parseFloat(amount),
        description: description.trim().slice(0, 200),
        category,
        card,
        brand: brand.trim().slice(0, 100),
        paidBy: paidBy as Person,
        date,
        paymentType: paymentType || undefined,
        thirdPartyName: isThirdParty && thirdPartyName.trim() ? thirdPartyName.trim() : undefined,
      });
      toast.success('Gasto registrado.');
      setAmount('');
      setDescription('');
      setCategory('');
      setCard('');
      setBrand('');
      setPaidBy('');
      setPaymentType('');
      setIsThirdParty(false);
      setThirdPartyName('');
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
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
            <Label>Pagado por</Label>
            <div className="flex gap-3">
              {([
                { value: 'boyfriend' as Person, img: sheriffBoy, label: PERSON_NAMES.boyfriend },
                { value: 'girlfriend' as Person, img: sheriffGirl, label: PERSON_NAMES.girlfriend },
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
            <Label>Descripcion</Label>
            <Input placeholder="Concepto del gasto" value={description} onChange={e => setDescription(e.target.value)} maxLength={200} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>
                      <span className="flex items-center gap-2">
                        <CategoryIcon category={c} className="h-3.5 w-3.5" />
                        {c}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tarjeta / Metodo</Label>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo de pago <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Select value={paymentType} onValueChange={v => setPaymentType(v as PaymentType)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credito">Credito</SelectItem>
                  <SelectItem value="debito">Debito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Marca / Tienda <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input placeholder="Ej: Oxxo, Amazon" value={brand} onChange={e => setBrand(e.target.value)} maxLength={100} />
            </div>
          </div>

          {/* Third party */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <Label className="text-sm">Gasto de alguien mas</Label>
            <Switch checked={isThirdParty} onCheckedChange={setIsThirdParty} />
          </div>
          {isThirdParty && (
            <div className="space-y-2">
              <Label>Nombre de la persona</Label>
              <Input placeholder="Nombre" value={thirdPartyName} onChange={e => setThirdPartyName(e.target.value)} maxLength={50} />
            </div>
          )}

          <Button type="submit" className="w-full text-base font-bold" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Registrar Gasto'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
