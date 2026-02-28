import { useState } from 'react';
import { deleteField } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Expense, CATEGORIES, CARDS, Person, PERSON_NAMES, PaymentType } from '@/lib/types';
import CategoryIcon from '@/components/CategoryIcon';
import CardBrandIcon from '@/components/CardBrandIcon';
import { CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';

interface Props {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, data: Partial<Expense>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function ExpenseEditDialog({ expense, open, onOpenChange, onUpdate, onDelete }: Props) {
  const { t } = useI18n();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [card, setCard] = useState('');
  const [brand, setBrand] = useState('');
  const [paidBy, setPaidBy] = useState<Person>('boyfriend');
  const [date, setDate] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('');
  const [thirdPartyName, setThirdPartyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);

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
    setThirdPartyName(expense.thirdPartyName || '');
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
        ...(paymentType && { paymentType }),
        thirdPartyName: thirdPartyName.trim() ? thirdPartyName.trim() : (deleteField() as unknown as string),
      });
      setSuccessDialogOpen(true);
    } catch {
      toast.error(t('errorUpdating'));
    } finally {
      setSaving(false);
    }
  };

  const handleSuccessContinue = () => {
    setSuccessDialogOpen(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    setConfirmDeleteOpen(false);
    try {
      await onDelete(expense.id);
      toast.success(t('expenseDeleted'));
      onOpenChange(false);
    } catch {
      toast.error(t('errorDeleting'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t('editExpense')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('amount')}</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('date')}</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('description')}</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('category')}</Label>
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
              <Label className="text-xs">{t('card')}</Label>
              <Select value={card} onValueChange={setCard}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CARDS.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <CardBrandIcon card={c.value} className="h-4 w-4" />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('paidBy')}</Label>
              <Select value={paidBy} onValueChange={v => setPaidBy(v as Person)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boyfriend">{PERSON_NAMES.boyfriend}</SelectItem>
                  <SelectItem value="girlfriend">{PERSON_NAMES.girlfriend}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('paymentType')}</Label>
              <Select value={paymentType || 'none'} onValueChange={v => setPaymentType(v === 'none' ? '' : v as PaymentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="credito">{t('credit')}</SelectItem>
                  <SelectItem value="debito">{t('debit')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('brand')}</Label>
            <Input value={brand} onChange={e => setBrand(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('expenseForSomeone')} {t('optional')}</Label>
            <Input placeholder={t('name')} value={thirdPartyName} onChange={e => setThirdPartyName(e.target.value)} maxLength={50} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1 rounded-xl" disabled={saving}>
              {saving ? t('saving2') : t('save')}
            </Button>
            <Button variant="destructive" onClick={() => setConfirmDeleteOpen(true)} className="rounded-xl">{t('deleteExpense')}</Button>
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDeleteExpense')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmDeleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('deleteExpense')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="p-3 rounded-full bg-accent/15">
                <CheckCircle2 className="h-10 w-10 text-accent" />
              </div>
              <AlertDialogTitle className="text-center text-lg">
                {t('expenseSaved')}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                {t('changesSaved')}
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={handleSuccessContinue} className="w-full rounded-xl h-11 text-base font-bold">
              {t('continue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
