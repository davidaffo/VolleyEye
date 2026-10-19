import { TabButton } from '../RuntimeControls.jsx';

const pages = [
  ['match', 'Partite', 'lobby-only active'],
  ['scout', 'Scout live', 'match-session-only'],
  ['aggregated', 'Analisi', 'match-session-only'],
  ['video', 'Video', 'match-session-only'],
  ['info', 'Impostazioni', ''],
];

export function NavigationLinks({ mobile = false }) {
  return pages.map(([tab, label, visibility]) => (
    <TabButton key={tab} data-tab-target={tab}
      className={['tab-btn', mobile ? 'tab-dot' : '', visibility, !mobile && tab === 'info' ? 'global-settings-btn' : ''].filter(Boolean).join(' ')}
      aria-label={mobile ? label : undefined}>{label}</TabButton>
  ));
}
