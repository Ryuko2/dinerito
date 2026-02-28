import { useSettings } from '@/lib/settings';

interface Props {
  amount: number;
  variant?: 'expense' | 'income' | 'neutral';
  className?: string;
}

const CURRENCY_LOCALE: Record<string, string> = {
  MXN: 'es-MX',
  USD: 'en-US',
  EUR: 'de-DE',
};

export default function CurrencyDisplay({ amount, variant = 'neutral', className = '' }: Props) {
  const { settings } = useSettings();
  const locale = CURRENCY_LOCALE[settings.currency] ?? 'es-MX';
  const formatted = (
    settings.showCents
      ? new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: settings.currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: settings.currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
  ).format(Math.abs(amount));

  const colorClass =
    variant === 'expense' ? 'text-rust-red' :
    variant === 'income' ? 'text-sage-green' :
    'text-foreground';

  return (
    <span className={`font-mono tabular-nums ${colorClass} ${className}`} style={{ fontFamily: "'DM Mono', monospace" }}>
      {amount < 0 ? '-' : ''}{formatted}
    </span>
  );
}
