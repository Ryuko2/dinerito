interface Props {
  amount: number;
  variant?: 'expense' | 'income' | 'neutral';
  className?: string;
}

export default function CurrencyDisplay({ amount, variant = 'neutral', className = '' }: Props) {
  const formatted = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

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
