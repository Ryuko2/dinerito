import type { Expense, Income, SavingsGoal, Budget } from './types';

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
  rarity: AchievementRarity;
  color: string;
  color2: string;
  unlockedAt?: Date;
  check: (data: AchievementData) => boolean;
}

export interface AchievementData {
  expenses: Expense[];
  incomes: Income[];
  goals: SavingsGoal[];
  budgets: Budget[];
}

export const RARITY_COLORS: Record<AchievementRarity, { c1: string; c2: string; glow: string }> = {
  common:    { c1: '#a8c7fa', c2: '#4a90d9', glow: '#4a90d9' },
  rare:      { c1: '#a8edea', c2: '#10b981', glow: '#10b981' },
  epic:      { c1: '#ddb4eb', c2: '#9333ea', glow: '#9333ea' },
  legendary: { c1: '#fde68a', c2: '#f59e0b', glow: '#f59e0b' },
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_shot',
    name: 'El Primer Disparo',
    nameEn: 'First Shot',
    description: 'Registraste tu primer gasto. ¡El sheriff está en acción!',
    descriptionEn: 'You logged your first expense. The sheriff is on duty!',
    icon: '🔫',
    rarity: 'common',
    color: '#a8c7fa', color2: '#4a90d9',
    check: ({ expenses }) => expenses.length >= 1,
  },
  {
    id: 'saddle_up',
    name: 'Ensillar el Caballo',
    nameEn: 'Saddle Up',
    description: 'Registraste 10 gastos. Ya estás en marcha, vaquero.',
    descriptionEn: 'Logged 10 expenses. You are on the trail, cowboy.',
    icon: '🐴',
    rarity: 'common',
    color: '#a8c7fa', color2: '#4a90d9',
    check: ({ expenses }) => expenses.length >= 10,
  },
  {
    id: 'first_deposit',
    name: 'El Primer Lingote',
    nameEn: 'First Gold Bar',
    description: 'Registraste tu primer ingreso. El oro llega al banco.',
    descriptionEn: 'Logged your first income. Gold arrives at the bank.',
    icon: '🪙',
    rarity: 'common',
    color: '#a8c7fa', color2: '#4a90d9',
    check: ({ incomes }) => incomes.length >= 1,
  },
  {
    id: 'budget_keeper',
    name: 'Guardián del Rancho',
    nameEn: 'Ranch Guardian',
    description: 'Creaste tu primer presupuesto. El rancho está bajo control.',
    descriptionEn: 'Created your first budget. The ranch is under control.',
    icon: '🏚️',
    rarity: 'common',
    color: '#a8c7fa', color2: '#4a90d9',
    check: ({ budgets }) => budgets.length >= 1,
  },
  {
    id: 'dreamer',
    name: 'El Soñador del Oeste',
    nameEn: 'Western Dreamer',
    description: 'Creaste tu primera meta de ahorro. Los sueños tienen precio.',
    descriptionEn: 'Created your first savings goal.',
    icon: '⭐',
    rarity: 'common',
    color: '#a8c7fa', color2: '#4a90d9',
    check: ({ goals }) => goals.length >= 1,
  },
  {
    id: 'trail_blazer',
    name: 'Pionero del Sendero',
    nameEn: 'Trail Blazer',
    description: 'Registraste 50 gastos. Eres toda una leyenda del rastro.',
    descriptionEn: 'Logged 50 expenses. You are a trail legend.',
    icon: '🌵',
    rarity: 'rare',
    color: '#a8edea', color2: '#10b981',
    check: ({ expenses }) => expenses.length >= 50,
  },
  {
    id: 'under_budget',
    name: 'Bajo el Límite, Partner',
    nameEn: 'Under the Limit, Partner',
    description: 'Completaste un mes sin exceder ningún presupuesto.',
    descriptionEn: 'Completed a month without exceeding any budget.',
    icon: '✅',
    rarity: 'rare',
    color: '#a8edea', color2: '#10b981',
    check: ({ budgets, expenses }) => {
      if (budgets.length === 0) return false;
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
      return budgets.every(b => {
        const spent = expenses.filter(e => e.date >= monthStart &&
          (b.category === 'all' || e.category === b.category) &&
          (b.person === 'all' || e.paidBy === b.person)
        ).reduce((s, e) => s + e.amount, 0);
        return spent <= b.limitAmount;
      });
    },
  },
  {
    id: 'half_way',
    name: 'Mitad del Camino',
    nameEn: 'Halfway There',
    description: 'Llegaste al 50% de una meta de ahorro. ¡Sigue, cowboy!',
    descriptionEn: 'Reached 50% of a savings goal.',
    icon: '🎯',
    rarity: 'rare',
    color: '#a8edea', color2: '#10b981',
    check: ({ goals }) => goals.some(g => g.targetAmount > 0 && g.currentAmount / g.targetAmount >= 0.5),
  },
  {
    id: 'income_rider',
    name: 'El Jinete Rico',
    nameEn: 'The Wealthy Rider',
    description: 'Registraste más de $10,000 MXN en ingresos en un mes.',
    descriptionEn: 'Logged over $10,000 MXN in income in one month.',
    icon: '🤠',
    rarity: 'rare',
    color: '#a8edea', color2: '#10b981',
    check: ({ incomes }) => {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
      const total = incomes.filter(i => i.date >= monthStart).reduce((s, i) => s + i.amount, 0);
      return total >= 10000;
    },
  },
  {
    id: 'savings_spurs',
    name: 'Las Espuelas del Ahorro',
    nameEn: 'Savings Spurs',
    description: 'Tus gastos este mes son menos del 60% de tus ingresos.',
    descriptionEn: 'Your expenses this month are under 60% of your income.',
    icon: '💰',
    rarity: 'rare',
    color: '#a8edea', color2: '#10b981',
    check: ({ expenses, incomes }) => {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
      const inc = incomes.filter(i => i.date >= monthStart).reduce((s, i) => s + i.amount, 0);
      const exp = expenses.filter(e => e.date >= monthStart).reduce((s, e) => s + e.amount, 0);
      return inc > 0 && exp / inc <= 0.6;
    },
  },
  {
    id: 'bounty_hunter',
    name: 'El Cazarrecompensas',
    nameEn: 'The Bounty Hunter',
    description: 'Completaste una meta de ahorro al 100%. ¡Recompensa cobrada!',
    descriptionEn: 'Completed a savings goal 100%.',
    icon: '🏆',
    rarity: 'epic',
    color: '#ddb4eb', color2: '#9333ea',
    check: ({ goals }) => goals.some(g => g.currentAmount >= g.targetAmount),
  },
  {
    id: 'sharp_shooter',
    name: 'El Tirador Certero',
    nameEn: 'The Sharp Shooter',
    description: 'Registraste 100 gastos. Eres toda una institución del Oeste.',
    descriptionEn: 'Logged 100 expenses. A true Western institution.',
    icon: '🎖️',
    rarity: 'epic',
    color: '#ddb4eb', color2: '#9333ea',
    check: ({ expenses }) => expenses.length >= 100,
  },
  {
    id: 'iron_will',
    name: 'Voluntad de Hierro',
    nameEn: 'Iron Will',
    description: 'Redujiste tus gastos un 20% comparado al mes anterior.',
    descriptionEn: 'Reduced expenses by 20% compared to last month.',
    icon: '⚔️',
    rarity: 'epic',
    color: '#ddb4eb', color2: '#9333ea',
    check: ({ expenses }) => {
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonth = `${lastDate.getFullYear()}-${String(lastDate.getMonth()+1).padStart(2,'0')}`;
      const thisTotal = expenses.filter(e => e.date.startsWith(thisMonth)).reduce((s, e) => s + e.amount, 0);
      const lastTotal = expenses.filter(e => e.date.startsWith(lastMonth)).reduce((s, e) => s + e.amount, 0);
      return lastTotal > 0 && thisTotal <= lastTotal * 0.8;
    },
  },
  {
    id: 'three_goals',
    name: 'El Trío Invencible',
    nameEn: 'The Invincible Trio',
    description: 'Tienes 3 metas de ahorro activas. El horizonte es tuyo.',
    descriptionEn: 'You have 3 active savings goals.',
    icon: '🌅',
    rarity: 'epic',
    color: '#ddb4eb', color2: '#9333ea',
    check: ({ goals }) => goals.length >= 3,
  },
  {
    id: 'gold_rush',
    name: 'La Fiebre del Oro',
    nameEn: 'The Gold Rush',
    description: 'Tus ahorros superan el 40% de tus ingresos este mes. ¡Leyenda!',
    descriptionEn: 'Your savings exceed 40% of income this month. Legend!',
    icon: '👑',
    rarity: 'legendary',
    color: '#fde68a', color2: '#f59e0b',
    check: ({ expenses, incomes }) => {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
      const inc = incomes.filter(i => i.date >= monthStart).reduce((s, i) => s + i.amount, 0);
      const exp = expenses.filter(e => e.date >= monthStart).reduce((s, e) => s + e.amount, 0);
      return inc > 0 && (inc - exp) / inc >= 0.4;
    },
  },
  {
    id: 'sheriff_badge',
    name: 'La Placa del Sheriff',
    nameEn: 'The Sheriff Badge',
    description: 'Desbloqueaste todos los logros comunes y raros. El Oeste es tuyo.',
    descriptionEn: 'Unlocked all common and rare achievements.',
    icon: '⭐',
    rarity: 'legendary',
    color: '#fde68a', color2: '#f59e0b',
    check: (data) => {
      const commonAndRare = ACHIEVEMENTS.filter(a =>
        (a.rarity === 'common' || a.rarity === 'rare') && a.id !== 'sheriff_badge'
      );
      return commonAndRare.every(a => a.check(data));
    },
  },
  {
    id: 'two_goals_done',
    name: 'El Doble o Nada',
    nameEn: 'Double or Nothing',
    description: 'Completaste 2 metas de ahorro. Eres imparable, partner.',
    descriptionEn: 'Completed 2 savings goals. You are unstoppable, partner.',
    icon: '🌟',
    rarity: 'legendary',
    color: '#fde68a', color2: '#f59e0b',
    check: ({ goals }) => goals.filter(g => g.currentAmount >= g.targetAmount).length >= 2,
  },
];

export function getEarnedAchievements(data: AchievementData): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.check(data));
}

export function getUnlockedCount(data: AchievementData): number {
  return getEarnedAchievements(data).length;
}
