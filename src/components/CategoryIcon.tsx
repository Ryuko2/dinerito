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

interface Props {
  category?: string;
  iconName?: string;
  className?: string;
}

export default function CategoryIcon({ category, iconName, className = 'h-4 w-4' }: Props) {
  const name = iconName || (category ? CATEGORY_ICONS[category] : undefined) || 'MoreHorizontal';
  const Icon = iconMap[name] || MoreHorizontal;
  return <Icon className={className} />;
}
