import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Locale = 'es' | 'en';

const STORAGE_KEY = 'sheriff-locale';

export const translations = {
  es: {
    appTitle: 'First Bank of the West',
    appSubtitle: 'Kevin & Angeles',
    add: 'Registrar Gasto',
    dashboard: 'Mi Libro',
    income: 'Depósitos',
    budgets: 'Asignación Mensual',
    goals: 'Metas',
    gastometer: 'Gastómetro',
    registerExpense: 'Registrar Gasto',
    paidBy: 'Pagado por',
    amount: 'Monto (MXN)',
    date: 'Fecha',
    description: 'Descripción',
    category: 'Categoría',
    card: 'Tarjeta / Método',
    paymentType: 'Tipo de pago',
    optional: '(opcional)',
    brand: 'Marca / Tienda',
    expenseForSomeone: 'Gasto de alguien más',
    other: 'Otro',
    submitExpense: 'Registrar Gasto',
    saving: 'Archivando...',
    expenseSaved: 'Duly recorded in the ledger',
    expenseSavedDesc: 'Duly recorded in the ledger.',
    continue: 'Continuar',
    completeRequired: 'Completa los campos obligatorios.',
    errorSaving: 'Error al guardar.',
    selectPersonForThirdParty: 'Selecciona la persona o escribe el nombre.',
    filters: 'Filtros',
    from: 'Desde',
    to: 'Hasta',
    person: 'Persona',
    all: 'Todos',
    allFem: 'Todas',
    expenses: 'Retiros',
    total: 'Total',
    byCategory: 'Por Categoría',
    trend: 'Tendencia',
    noExpenses: 'Tu libro está limpio, partner. Registra tu primer retiro para comenzar.',
    credit: 'Crédito',
    debit: 'Débito',
    for: 'Para',
    exportData: 'Exportar mis datos',
    importData: 'Importar datos',
    backupDownloaded: 'Respaldo descargado.',
    dataRestored: 'Datos restaurados',
    records: 'registros',
    loading: 'Cargando...',
    errorLoading: 'Error al cargar datos.',
    checkConnection: 'Revisa tu conexión y la configuración de Firebase.',
    showingSaved: 'Mostrando datos guardados. Revisa tu conexión para sincronizar con la nube.',
    addIncome: 'Registrar Depósito',
    registerIncome: 'Registrar Depósito',
    incomes: 'Depósitos',
    balance: 'Saldo',
    newGoal: 'Nueva',
    newBudget: 'Nuevo',
    gastometerTitle: 'Gastómetro',
    gastometerDesc: 'Compara tus retiros con tus depósitos',
    incomeLabel: 'Depósitos',
    expensesLabel: 'Retiros',
    spendingRatio: 'Retiros / Depósitos',
    statusOk: 'Todo bien',
    statusWarm: 'Cuidado',
    statusHot: 'Al límite',
    statusDanger: 'Excedido',
    voidEntry: 'Anular Registro',
    amendRecord: 'Modificar Registro',
    fileRecord: 'Archivar',
    abandon: 'Abandonar',
    bankPreferences: 'Preferencias del Banco',
    voidConfirm: '¿Anular este registro del libro? Esta acción no se puede deshacer, partner.',
  },
  en: {
    appTitle: 'First Bank of the West',
    appSubtitle: 'Kevin & Angeles',
    add: 'Register Expense',
    dashboard: 'My Ledger',
    income: 'Deposits',
    budgets: 'Monthly Allowance',
    goals: 'Goals',
    gastometer: 'Gastometer',
    registerExpense: 'Register Expense',
    paidBy: 'Paid by',
    amount: 'Amount (MXN)',
    date: 'Date',
    description: 'Description',
    category: 'Category',
    card: 'Card / Method',
    paymentType: 'Payment type',
    optional: '(optional)',
    brand: 'Brand / Store',
    expenseForSomeone: 'Expense for someone else',
    other: 'Other',
    submitExpense: 'Register Expense',
    saving: 'Filing...',
    expenseSaved: 'Duly recorded in the ledger',
    expenseSavedDesc: 'Duly recorded in the ledger.',
    continue: 'Continue',
    completeRequired: 'Complete the required fields.',
    errorSaving: 'Error saving.',
    selectPersonForThirdParty: 'Select the person or type the name.',
    filters: 'Filters',
    from: 'From',
    to: 'To',
    person: 'Person',
    all: 'All',
    allFem: 'All',
    expenses: 'Withdrawals',
    total: 'Total',
    byCategory: 'By Category',
    trend: 'Trend',
    noExpenses: 'Your ledger is clean, partner. Record your first withdrawal to get started.',
    credit: 'Credit',
    debit: 'Debit',
    for: 'For',
    exportData: 'Export my data',
    importData: 'Import data',
    backupDownloaded: 'Backup downloaded.',
    dataRestored: 'Data restored',
    records: 'records',
    loading: 'Loading...',
    errorLoading: 'Error loading data.',
    checkConnection: 'Check your connection and Firebase configuration.',
    showingSaved: 'Showing saved data. Check your connection to sync with the cloud.',
    addIncome: 'Record Deposit',
    registerIncome: 'Record Deposit',
    incomes: 'Deposits',
    balance: 'Balance',
    newGoal: 'New',
    newBudget: 'New',
    gastometerTitle: 'Gastometer',
    gastometerDesc: 'Compare your withdrawals with your deposits',
    incomeLabel: 'Deposits',
    expensesLabel: 'Withdrawals',
    spendingRatio: 'Withdrawals / Deposits',
    statusOk: 'All good',
    statusWarm: 'Careful',
    statusHot: 'At limit',
    statusDanger: 'Exceeded',
    voidEntry: 'Void Entry',
    amendRecord: 'Amend Record',
    fileRecord: 'File Record',
    abandon: 'Abandon',
    bankPreferences: 'Bank Preferences',
    voidConfirm: 'Void this entry from the ledger? This cannot be undone, partner.',
  },
} as const;

type TranslationKey = keyof typeof translations.es;

const I18nContext = createContext<{
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
} | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      return stored === 'en' || stored === 'es' ? stored : 'es';
    } catch {
      return 'es';
    }
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[locale][key] ?? key,
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
