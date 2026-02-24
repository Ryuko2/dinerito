import { Banknote, CreditCard, ArrowLeftRight } from 'lucide-react';

interface Props {
  card: string;
  className?: string;
  showLabel?: boolean;
}

/** Minimalist SVG brand marks for Mexican bank cards */
export default function CardBrandIcon({ card, className = 'h-4 w-4', showLabel = false }: Props) {
  const icon = CARD_ICONS[card];
  if (!icon) return <CreditCard className={className} />;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center justify-center rounded-md ${className}`}
        style={{ backgroundColor: icon.bg, color: icon.fg, padding: '2px' }}
      >
        {icon.svg}
      </span>
      {showLabel && <span className="text-xs font-medium">{icon.label}</span>}
    </span>
  );
}

const CARD_ICONS: Record<string, { label: string; bg: string; fg: string; svg: React.ReactNode }> = {
  efectivo: {
    label: 'Efectivo',
    bg: 'hsl(145, 50%, 92%)',
    fg: 'hsl(145, 50%, 30%)',
    svg: <Banknote className="h-full w-full" strokeWidth={1.8} />,
  },
  santander: {
    label: 'Santander',
    bg: 'hsl(0, 80%, 95%)',
    fg: 'hsl(0, 80%, 42%)',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        <path d="M12 4L6 12l6 8 6-8-6-8z" fill="currentColor" opacity={0.2} />
        <path d="M12 6l4.5 6L12 18 7.5 12 12 6z" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
        <path d="M12 9v6" stroke="currentColor" strokeWidth={1.2} />
      </svg>
    ),
  },
  bbva: {
    label: 'BBVA',
    bg: 'hsl(210, 80%, 94%)',
    fg: 'hsl(210, 80%, 35%)',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth={1.5} />
        <path d="M8 12h8M8 15h5" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
        <circle cx="17" cy="9.5" r="1.5" fill="currentColor" opacity={0.4} />
      </svg>
    ),
  },
  amex: {
    label: 'Amex',
    bg: 'hsl(210, 30%, 93%)',
    fg: 'hsl(210, 30%, 35%)',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth={1.5} />
        <path d="M8 12h8" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
        <path d="M12 9v6" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
      </svg>
    ),
  },
  banamex: {
    label: 'Citibanamex',
    bg: 'hsl(210, 90%, 94%)',
    fg: 'hsl(210, 90%, 38%)',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth={1.5} />
        <path d="M12 7v10M8 12h8" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
        <circle cx="12" cy="12" r="3" fill="currentColor" opacity={0.15} />
      </svg>
    ),
  },
  banorte: {
    label: 'Banorte',
    bg: 'hsl(15, 85%, 94%)',
    fg: 'hsl(15, 85%, 40%)',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
        <path d="M4 8h16v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" stroke="currentColor" strokeWidth={1.5} />
        <path d="M4 8l8-4 8 4" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
        <path d="M9 12v4M12 11v5M15 12v4" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
      </svg>
    ),
  },
  transferencia: {
    label: 'Transferencia',
    bg: 'hsl(200, 40%, 93%)',
    fg: 'hsl(200, 40%, 35%)',
    svg: <ArrowLeftRight className="h-full w-full" strokeWidth={1.8} />,
  },
};

export { CARD_ICONS };
