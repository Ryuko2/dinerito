import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import AchievementCard from './AchievementCard';
import { ACHIEVEMENTS, getEarnedAchievements, type AchievementData, type AchievementRarity } from '@/lib/achievements';
import { PERSON_NAMES } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  person: 'boyfriend' | 'girlfriend' | null;
  avatarSrc: string;
  data: AchievementData;
}

const RARITY_ORDER: AchievementRarity[] = ['legendary', 'epic', 'rare', 'common'];

export default function ProfileDialog({ open, onClose, person, avatarSrc, data }: Props) {
  const { t, locale } = useI18n();
  const [selectedAchievement, setSelectedAchievement] = useState<string | null>(null);
  const earned = getEarnedAchievements(data);
  const earnedIds = new Set(earned.map(a => a.id));
  const name = person ? PERSON_NAMES[person] : '';
  const earnedCount = earned.length;
  const totalCount = ACHIEVEMENTS.length;

  const byRarity = RARITY_ORDER.map(rarity => ({
    rarity,
    achievements: ACHIEVEMENTS.filter(a => a.rarity === rarity),
  }));

  const selectedAch = ACHIEVEMENTS.find(a => a.id === selectedAchievement);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-sm w-full p-0 overflow-hidden rounded-3xl border-0"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">{t('profileOf')} {name}</DialogTitle>

        <div className="relative bg-gradient-to-b from-primary/20 to-background pt-8 pb-4 px-4 text-center">
          <div className="relative inline-block">
            <img
              src={avatarSrc}
              alt={name}
              className="w-24 h-24 rounded-full ring-4 ring-primary/40 shadow-xl mx-auto"
            />
            {earnedCount > 0 && (
              <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow">
                {earnedCount}
              </div>
            )}
          </div>
          <h2 className="text-xl font-bold mt-3">{name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {earnedCount} / {totalCount} {t('achievementsUnlocked')}
          </p>
          <div className="mt-3 mx-4 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000"
              style={{ width: `${(earnedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {selectedAch && earnedIds.has(selectedAch.id) && (
          <div className="mx-4 my-2 p-3 rounded-2xl bg-muted/50 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="text-2xl">{selectedAch.icon}</span>
            <div>
              <p className="font-bold text-sm">{locale === 'es' ? selectedAch.name : selectedAch.nameEn}</p>
              <p className="text-xs text-muted-foreground">{locale === 'es' ? selectedAch.description : selectedAch.descriptionEn}</p>
            </div>
          </div>
        )}

        <div className="overflow-y-auto max-h-[60vh] px-4 pb-6 space-y-4">
          {byRarity.map(({ rarity, achievements }) => (
            <div key={rarity}>
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                rarity === 'legendary' ? 'text-yellow-500' :
                rarity === 'epic' ? 'text-purple-500' :
                rarity === 'rare' ? 'text-emerald-500' : 'text-blue-500'
              }`}>
                {rarity === 'legendary' ? '★ Legendarios' :
                 rarity === 'epic' ? '◆ Épicos' :
                 rarity === 'rare' ? '● Raros' : '· Comunes'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {achievements.map(a => (
                  <AchievementCard
                    key={a.id}
                    achievement={a}
                    earned={earnedIds.has(a.id)}
                    size="sm"
                    onClick={() => setSelectedAchievement(
                      selectedAchievement === a.id ? null : a.id
                    )}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
