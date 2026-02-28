import type { Achievement } from '@/lib/achievements';

interface Props {
  achievement: Achievement;
  earned: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = { sm: 'w-24', md: 'w-36', lg: 'w-48' };
const RARITY_LABELS = {
  common: '· Común',
  rare: '● Raro',
  epic: '◆ Épico',
  legendary: '★ Legendario',
};
const RARITY_TEXT_COLORS = {
  common: 'text-blue-500',
  rare: 'text-emerald-500',
  epic: 'text-purple-500',
  legendary: 'text-yellow-500',
};
const RARITY_BG = {
  common: 'bg-blue-500/10 border-blue-500/30',
  rare: 'bg-emerald-500/10 border-emerald-500/30',
  epic: 'bg-purple-500/10 border-purple-500/30',
  legendary: 'bg-yellow-500/10 border-yellow-500/30',
};

export default function AchievementCard({ achievement, earned, onClick, size = 'md' }: Props) {
  return (
    <div
      onClick={onClick}
      className={`
        ${SIZE_CLASSES[size]} aspect-[3/4] rounded-2xl border-2 p-2
        flex flex-col items-center justify-between
        cursor-pointer select-none transition-all duration-200
        ${earned
          ? `${RARITY_BG[achievement.rarity]} hover:scale-105 active:scale-95`
          : 'bg-muted/30 border-muted grayscale opacity-50 cursor-default'
        }
      `}
    >
      <span className={`text-[8px] font-bold uppercase tracking-wider ${earned ? RARITY_TEXT_COLORS[achievement.rarity] : 'text-muted-foreground'}`}>
        {RARITY_LABELS[achievement.rarity]}
      </span>

      <span className={`${size === 'sm' ? 'text-2xl' : 'text-4xl'}`}>
        {earned ? achievement.icon : '🔒'}
      </span>

      <div className="text-center">
        <p className={`${size === 'sm' ? 'text-[9px]' : 'text-[11px]'} font-bold leading-tight ${earned ? 'text-foreground' : 'text-muted-foreground'}`}>
          {achievement.name}
        </p>
      </div>
    </div>
  );
}
