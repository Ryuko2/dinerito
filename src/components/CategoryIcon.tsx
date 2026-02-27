import { CATEGORY_ICONS } from '@/lib/types';
import {
  UtensilsCrossed, Car, Film, ShoppingBag, Heart, Home,
  GraduationCap, Gift, Repeat, MoreHorizontal,
  Plane, Laptop, Smartphone, Gem, Guitar, Palmtree, Target
} from 'lucide-react';

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  UtensilsCrossed, Car, Film, ShoppingBag, Heart, Home,
  GraduationCap, Gift, Repeat, MoreHorizontal,
  Plane, Laptop, Smartphone, Gem, Guitar, Palmtree, Target,
};

/** Western emoji icons for Old West Bank theme */
const WESTERN_EMOJI: Record<string, string> = {
  Comida: '🍖',
  Transporte: '🐎',
  Entretenimiento: '🎸',
  Ropa: '🪣',
  Salud: '🌵',
  Hogar: '🏚️',
  Educacion: '📜',
  Regalos: '🎁',
  Suscripciones: '🔄',
  Otro: '⭐',
};

interface Props {
  category?: string;
  iconName?: string;
  className?: string;
  western?: boolean;
}

export default function CategoryIcon({ category, iconName, className = 'h-4 w-4', western = true }: Props) {
  if (western && category && WESTERN_EMOJI[category]) {
    return (
      <span className={`inline-block leading-none ${className}`} style={{ fontSize: '1em' }}>
        {WESTERN_EMOJI[category]}
      </span>
    );
  }
  const name = iconName || (category ? CATEGORY_ICONS[category] : undefined) || 'MoreHorizontal';
  const Icon = iconMap[name] || MoreHorizontal;
  return <Icon className={className} />;
}
