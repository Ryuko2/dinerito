import { useI18n } from '@/lib/i18n';
import { useSettings, type FontSize, type Currency, type DateFormat } from '@/lib/settings';

export default function SettingsPage() {
  const { locale, setLocale } = useI18n();
  const { settings, updateSetting, resetSettings } = useSettings();

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-foreground">
          {locale === 'es' ? 'Ajustes' : 'Settings'}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {locale === 'es' ? 'Personaliza tu experiencia' : 'Customize your experience'}
        </p>
      </div>

      {/* SECTION: Language */}
      <SettingsSection title={locale === 'es' ? '🌐 Idioma' : '🌐 Language'}>
        <SettingsRow
          label={locale === 'es' ? 'Idioma de la app' : 'App language'}
          description={locale === 'es' ? 'Cambia entre español e inglés' : 'Switch between Spanish and English'}
        >
          <div className="flex gap-2">
            <ChoiceButton active={locale === 'es'} onClick={() => setLocale('es')}>
              🇲🇽 Español
            </ChoiceButton>
            <ChoiceButton active={locale === 'en'} onClick={() => setLocale('en')}>
              🇺🇸 English
            </ChoiceButton>
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* SECTION: Appearance */}
      <SettingsSection title={locale === 'es' ? '🎨 Apariencia' : '🎨 Appearance'}>
        <SettingsRow
          label={locale === 'es' ? 'Tamaño del texto' : 'Text size'}
          description={locale === 'es' ? 'Ajusta el tamaño de la letra en toda la app' : 'Adjust text size throughout the app'}
        >
          <div className="flex gap-1.5">
            {(['small', 'medium', 'large', 'xlarge'] as FontSize[]).map((size) => (
              <ChoiceButton
                key={size}
                active={settings.fontSize === size}
                onClick={() => updateSetting('fontSize', size)}
              >
                <span
                  style={{
                    fontSize:
                      size === 'small' ? '11px' : size === 'medium' ? '13px' : size === 'large' ? '15px' : '17px',
                  }}
                >
                  A
                </span>
              </ChoiceButton>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {locale === 'es'
              ? `Actual: ${
                  settings.fontSize === 'small'
                    ? 'Pequeño'
                    : settings.fontSize === 'medium'
                      ? 'Normal'
                      : settings.fontSize === 'large'
                        ? 'Grande'
                        : 'Extra grande'
                }`
              : `Current: ${settings.fontSize.charAt(0).toUpperCase() + settings.fontSize.slice(1)}`}
          </p>
        </SettingsRow>

        <SettingsRow
          label={locale === 'es' ? 'Tarjetas compactas' : 'Compact cards'}
          description={locale === 'es' ? 'Muestra más gastos en pantalla' : 'Show more expenses on screen'}
        >
          <Toggle enabled={settings.compactCards} onChange={(v) => updateSetting('compactCards', v)} />
        </SettingsRow>

        <SettingsRow
          label={locale === 'es' ? 'Animaciones de avatares' : 'Avatar animations'}
          description={
            locale === 'es'
              ? 'Activa efectos en los avatares de Kevin y Angeles'
              : 'Enable effects on Kevin and Angeles avatars'
          }
        >
          <Toggle
            enabled={settings.avatarAnimations}
            onChange={(v) => updateSetting('avatarAnimations', v)}
          />
        </SettingsRow>
      </SettingsSection>

      {/* SECTION: Numbers & Dates */}
      <SettingsSection title={locale === 'es' ? '🔢 Números y fechas' : '🔢 Numbers & Dates'}>
        <SettingsRow
          label={locale === 'es' ? 'Moneda' : 'Currency'}
          description={locale === 'es' ? 'Símbolo que aparece en los montos' : 'Symbol shown next to amounts'}
        >
          <div className="flex gap-1.5">
            {(['MXN', 'USD', 'EUR'] as Currency[]).map((c) => (
              <ChoiceButton
                key={c}
                active={settings.currency === c}
                onClick={() => updateSetting('currency', c)}
              >
                {c === 'MXN' ? '🇲🇽 MXN' : c === 'USD' ? '🇺🇸 USD' : '🇪🇺 EUR'}
              </ChoiceButton>
            ))}
          </div>
        </SettingsRow>

        <SettingsRow
          label={locale === 'es' ? 'Mostrar centavos' : 'Show cents'}
          description={
            locale === 'es'
              ? 'Muestra los decimales en los montos (.00)'
              : 'Show decimal places in amounts (.00)'
          }
        >
          <Toggle enabled={settings.showCents} onChange={(v) => updateSetting('showCents', v)} />
        </SettingsRow>

        <SettingsRow
          label={locale === 'es' ? 'Formato de fecha' : 'Date format'}
          description={locale === 'es' ? 'Cómo se muestran las fechas' : 'How dates are displayed'}
        >
          <div className="flex flex-col gap-1.5">
            {(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as DateFormat[]).map((fmt) => (
              <ChoiceButton
                key={fmt}
                active={settings.dateFormat === fmt}
                onClick={() => updateSetting('dateFormat', fmt)}
                fullWidth
              >
                {fmt}
              </ChoiceButton>
            ))}
          </div>
        </SettingsRow>

        <SettingsRow
          label={locale === 'es' ? 'La semana empieza el' : 'Week starts on'}
        >
          <div className="flex gap-2">
            <ChoiceButton
              active={settings.weekStartDay === 'monday'}
              onClick={() => updateSetting('weekStartDay', 'monday')}
            >
              {locale === 'es' ? 'Lunes' : 'Monday'}
            </ChoiceButton>
            <ChoiceButton
              active={settings.weekStartDay === 'sunday'}
              onClick={() => updateSetting('weekStartDay', 'sunday')}
            >
              {locale === 'es' ? 'Domingo' : 'Sunday'}
            </ChoiceButton>
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* SECTION: Data & Privacy */}
      <SettingsSection title={locale === 'es' ? '📦 Datos y privacidad' : '📦 Data & Privacy'}>
        <SettingsRow
          label={locale === 'es' ? 'Exportar mis datos' : 'Export my data'}
          description={
            locale === 'es'
              ? 'Descarga un respaldo de todos tus registros'
              : 'Download a backup of all your records'
          }
        >
          <ActionButton
            onClick={() => {
              window.dispatchEvent(new CustomEvent('dinerito:export'));
            }}
          >
            {locale === 'es' ? '⬇️ Exportar' : '⬇️ Export'}
          </ActionButton>
        </SettingsRow>

        <SettingsRow
          label={locale === 'es' ? 'Importar datos' : 'Import data'}
          description={
            locale === 'es'
              ? 'Restaura registros desde un archivo de respaldo'
              : 'Restore records from a backup file'
          }
        >
          <ActionButton
            onClick={() => {
              window.dispatchEvent(new CustomEvent('dinerito:import'));
            }}
          >
            {locale === 'es' ? '⬆️ Importar' : '⬆️ Import'}
          </ActionButton>
        </SettingsRow>
      </SettingsSection>

      {/* SECTION: About */}
      <SettingsSection title={locale === 'es' ? 'ℹ️ Acerca de' : 'ℹ️ About'}>
        <div className="px-4 py-3 space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>{locale === 'es' ? 'Versión' : 'Version'}</span>
            <span className="font-medium text-foreground">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>{locale === 'es' ? 'Hecha con todo el corazón para' : 'Made with all my heart for'}</span>
            <span className="font-medium text-foreground">
              Mi berucita y más hermosa novia 🤍
            </span>
          </div>
          <div className="flex justify-between">
            <span>{locale === 'es' ? 'Fuente' : 'Font'}</span>
            <span className="font-medium text-foreground" style={{ fontFamily: 'Kanit' }}>
              Kanit
            </span>
          </div>
        </div>
      </SettingsSection>

      {/* Reset button */}
      <div className="px-1">
        <button
          onClick={() => {
            if (
              window.confirm(
                locale === 'es'
                  ? '¿Restablecer todos los ajustes a los valores predeterminados?'
                  : 'Reset all settings to defaults?'
              )
            )
              resetSettings();
          }}
          className="w-full py-3 rounded-xl border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors"
        >
          {locale === 'es' ? 'Restablecer ajustes' : 'Reset settings'}
        </button>
      </div>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
        {title}
      </h2>
      <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3.5 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        {children}
      </div>
    </div>
  );
}

function ChoiceButton({
  active,
  onClick,
  children,
  fullWidth,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all min-h-[36px] ${fullWidth ? 'w-full text-left' : ''} ${
        active
          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
          : 'bg-background text-muted-foreground border-border hover:border-primary/40'
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function ActionButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted transition-colors min-h-[36px]"
    >
      {children}
    </button>
  );
}
