import { useEffect, useRef } from 'react';
import type { Achievement } from '@/lib/achievements';
import { RARITY_COLORS } from '@/lib/achievements';

const HOLO_CSS = `
@property --ratio-x {
  syntax: "<number>";
  inherits: true;
  initial-value: 0;
}
@property --ratio-y {
  syntax: "<number>";
  inherits: true;
  initial-value: 0;
}
@property --correction {
  syntax: "<percent>";
  inherits: true;
  initial-value: 0%;
}
`;

let cssInjected = false;
function injectHoloCSS() {
  if (cssInjected) return;
  const style = document.createElement('style');
  style.textContent = HOLO_CSS;
  document.head.appendChild(style);
  cssInjected = true;
}

interface Props {
  achievement: Achievement;
  earned: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function AchievementCard({ achievement, earned, onClick, size = 'md' }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const colors = RARITY_COLORS[achievement.rarity];

  useEffect(() => {
    injectHoloCSS();
    const card = cardRef.current;
    if (!card || !earned) return;

    const updatePointerPosition = (e: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const hw = rect.width / 2;
      const hh = rect.height / 2;
      const ratioX = (e.clientX - (rect.x + hw)) / hw;
      const ratioY = (e.clientY - (rect.y + hh)) / hh;
      card.style.setProperty('--ratio-x', String(ratioX));
      card.style.setProperty('--ratio-y', String(ratioY));
    };

    const resetPointer = () => {
      card.style.setProperty('--ratio-x', '0');
      card.style.setProperty('--ratio-y', '0');
    };

    card.addEventListener('pointermove', updatePointerPosition);
    card.addEventListener('pointerleave', resetPointer);
    return () => {
      card.removeEventListener('pointermove', updatePointerPosition);
      card.removeEventListener('pointerleave', resetPointer);
    };
  }, [earned]);

  const sizeClasses = {
    sm: 'w-28',
    md: 'w-40',
    lg: 'w-56',
  };

  const cardStyle = earned ? {
    '--c1': colors.c1,
    '--glow': colors.glow,
    transformStyle: 'preserve-3d' as const,
    transition: 'transform 0.2s linear',
    transform: 'rotateY(calc(-20deg * var(--ratio-x))) rotateX(calc(20deg * var(--ratio-y)))',
    willChange: 'transform',
  } : {};

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={`
        ${sizeClasses[size]} aspect-[3.126/4] rounded-2xl relative overflow-hidden cursor-pointer
        select-none
        ${earned
          ? 'shadow-lg hover:shadow-2xl'
          : 'grayscale opacity-40 cursor-default'
        }
      `}
      style={{
        ...cardStyle,
        background: earned
          ? `linear-gradient(135deg, ${colors.c1} 0%, ${colors.c2} 100%)`
          : '#374151',
        boxShadow: earned ? `0 0 20px 2px ${colors.glow}40` : undefined,
      } as React.CSSProperties}
    >
      {earned && (
        <div
          className="absolute inset-0 rounded-2xl transition-opacity duration-200"
          style={{
            background: `
              radial-gradient(
                ellipse at calc(90% - var(--ratio-x, 0) * 20%) calc(0% - var(--ratio-y, 0) * 20%),
                rgba(255,255,255,0.7), ${colors.c1} 1%, rgba(255,100,200,0.76) 20%, transparent
              ),
              linear-gradient(
                110deg,
                #0093ff calc(10% - var(--ratio-x, 0) * 20%),
                #51d6fd calc(20% - var(--ratio-x, 0) * 20%),
                #0093ff calc(30% - var(--ratio-x, 0) * 20%),
                rgba(255,100,200,0.76) calc(60% - var(--ratio-x, 0) * 20%),
                transparent calc(100% - var(--ratio-x, 0) * 20%)
              )
            `,
            mixBlendMode: 'hard-light',
            opacity: 0.6,
          }}
        />
      )}

      {earned && (
        <div
          className="absolute inset-0 rounded-2xl opacity-20 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, ${colors.c1}88 0.15rem, transparent 0.15rem) repeat`,
            backgroundSize: '0.8rem 0.8rem',
          }}
        />
      )}

      <div className="absolute inset-0 flex flex-col items-center justify-between p-3 z-10">
        <div className="w-full flex justify-between items-center">
          <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
            achievement.rarity === 'legendary' ? 'bg-yellow-400/30 text-yellow-200' :
            achievement.rarity === 'epic' ? 'bg-purple-400/30 text-purple-200' :
            achievement.rarity === 'rare' ? 'bg-emerald-400/30 text-emerald-200' :
            'bg-blue-400/30 text-blue-200'
          }`}>
            {achievement.rarity === 'legendary' ? '★ Legendario' :
             achievement.rarity === 'epic' ? '◆ Épico' :
             achievement.rarity === 'rare' ? '● Raro' : '· Común'}
          </span>
          {!earned && <span className="text-xs">🔒</span>}
        </div>

        <div
          className="text-4xl transition-transform duration-200"
          style={earned ? {
            transformStyle: 'preserve-3d',
            transform: `perspective(100px) translateZ(0.5rem) translate(calc(var(--ratio-x, 0) * -0.5rem), calc(var(--ratio-y, 0) * -0.5rem))`,
          } : {}}
        >
          {earned ? achievement.icon : '🔒'}
        </div>

        <div className="w-full text-center">
          <p className={`text-[11px] font-bold leading-tight mb-0.5 ${earned ? 'text-white' : 'text-gray-400'}`}>
            {achievement.name}
          </p>
          <p className={`text-[9px] leading-tight ${earned ? 'text-white/70' : 'text-gray-500'}`}>
            {achievement.description}
          </p>
        </div>
      </div>
    </div>
  );
}
