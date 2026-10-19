import { ThemeButton } from './RuntimeControls.jsx';

export function ThemePicker({ suffix = '' }) {
  return (
    <div className="theme-toggle" role="group" aria-label="Tema applicazione">
      {[['dark', 'scuro', '🌙 Scuro'], ['light', 'chiaro', '☀️ Chiaro']].map(([theme, title, label]) => (
        <ThemeButton key={theme} type="button" id={'theme-' + theme + suffix}
          className="secondary" data-theme-choice={theme} aria-pressed="false" title={'Tema ' + title}>
          {label}
        </ThemeButton>
      ))}
    </div>
  );
}
