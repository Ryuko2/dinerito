import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { CATEGORIES, CARDS, Person, PERSON_NAMES, PaymentType } from '@/lib/types';
import { PlusCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import CategoryIcon from '@/components/CategoryIcon';
import CardBrandIcon from '@/components/CardBrandIcon';
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
  const [thirdPartySelection, setThirdPartySelection] = useState<'kevin' | 'angeles' | 'otro' | ''>('');
  const [thirdPartyOtherName, setThirdPartyOtherName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);

  const thirdPartyName = thirdPartySelection === 'kevin' ? PERSON_NAMES.boyfriend
    : thirdPartySelection === 'angeles' ? PERSON_NAMES.girlfriend
    : thirdPartySelection === 'otro' ? thirdPartyOtherName.trim()
    : '';

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setCategory('');
    setCard('');
    setBrand('');
    setPaidBy('');
    setPaymentType('');
    setIsThirdParty(false);
    setThirdPartySelection('');
    setThirdPartyOtherName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !category || !card || !paidBy) {
      toast.error('Completa los campos obligatorios.');
      return;
    }
    if (isThirdParty && thirdPartySelection === 'otro' && !thirdPartyOtherName.trim()) {
      toast.error('Selecciona la persona o escribe el nombre.');
      return;
    }
    if (isThirdParty && !thirdPartySelection) {
      toast.error('Selecciona la persona o escribe el nombre.');
      return;
    }
    setSubmitting(true);
    try {
      const savePromise = onExpenseAdded({
        amount: parseFloat(amount),
        description: description.trim().slice(0, 200),
        category,
        card,
        brand: brand.trim().slice(0, 100),
        paidBy: paidBy as Person,
        date,
        ...(paymentType && { paymentType }),
        ...(isThirdParty && thirdPartyName && { thirdPartyName }),
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 15000)
      );
      await Promise.race([savePromise, timeoutPromise]);
      setSubmitting(false);
      setSuccessDialogOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessContinue = () => {
    setSuccessDialogOpen(false);
    resetForm();
  };

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <div className="p-1.5 rounded-lg bg-primary/15">
            <PlusCircle className="h-5 w-5 text-primary" />
          </div>
          Registrar Gasto
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Who paid */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pagado por</Label>
            <div className="flex gap-3">
              {([
                { value: 'boyfriend' as Person, img: sheriffBoy, label: PERSON_NAMES.boyfriend },
                { value: 'girlfriend' as Person, img: sheriffGirl, label: PERSON_NAMES.girlfriend },
              ]).map(({ value, img, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaidBy(value)}
                  className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all duration-200 ${
                    paidBy === value
                      ? 'border-primary bg-primary/10 shadow-md scale-[1.02]'
                      : 'border-border hover:border-primary/30 hover:bg-muted/50'
                  }`}
                >
                  <img src={img} alt={label} className={`w-12 h-12 rounded-full transition-all ${paidBy === value ? 'ring-2 ring-primary ring-offset-2' : ''}`} />
                  <span className="text-sm font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Monto (MXN)</Label>
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
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Descripcion</Label>
            <Input placeholder="Concepto del gasto" value={description} onChange={e => setDescription(e.target.value)} maxLength={200} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Categoria</Label>
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
            <div className="space-y-1.5">
              <Label className="text-xs">Tarjeta / Metodo</Label>
              <Select value={card} onValueChange={setCard}>
                <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent>
                  {CARDS.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <CardBrandIcon card={c.value} className="h-5 w-5" />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de pago <span className="text-muted-foreground">(opcional)</span></Label>
              <Select value={paymentType} onValueChange={v => setPaymentType(v as PaymentType)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credito">Credito</SelectItem>
                  <SelectItem value="debito">Debito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Marca / Tienda <span className="text-muted-foreground">(opcional)</span></Label>
              <Input placeholder="Ej: Oxxo, Amazon" value={brand} onChange={e => setBrand(e.target.value)} maxLength={100} />
            </div>
          </div>

          {/* Third party */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
            <Label className="text-sm">Gasto de alguien mas</Label>
            <Switch checked={isThirdParty} onCheckedChange={(checked) => { setIsThirdParty(checked); if (!checked) { setThirdPartySelection(''); setThirdPartyOtherName(''); } }} />
          </div>
          {isThirdParty && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
              <Label className="text-xs">¿Para quién es el gasto?</Label>
              <div className="flex gap-2 flex-wrap">
                {([
                  { value: 'kevin' as const, img: sheriffBoy, label: PERSON_NAMES.boyfriend },
                  { value: 'angeles' as const, img: sheriffGirl, label: PERSON_NAMES.girlfriend },
                  { value: 'otro' as const, label: 'Otro' },
                ]).map(({ value, img, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setThirdPartySelection(value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all text-sm font-medium ${
                      thirdPartySelection === value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/30'
                    }`}
                  >
                    {img && <img src={img} alt="" className="w-6 h-6 rounded-full" />}
                    {label}
                  </button>
                ))}
              </div>
              {thirdPartySelection === 'otro' && (
                <Input placeholder="Nombre de la persona" value={thirdPartyOtherName} onChange={e => setThirdPartyOtherName(e.target.value)} maxLength={50} className="mt-1" />
              )}
            </div>
          )}

          <Button type="submit" className="w-full text-base font-bold h-12 rounded-xl shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Registrar Gasto'}
          </Button>
        </form>
      </CardContent>

      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="p-3 rounded-full bg-accent/15">
                <CheckCircle2 className="h-10 w-10 text-accent" />
              </div>
              <AlertDialogTitle className="text-center text-lg">
                Gasto guardado correctamente
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                Tu gasto ha sido registrado exitosamente.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={handleSuccessContinue} className="w-full rounded-xl h-11 text-base font-bold">
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
