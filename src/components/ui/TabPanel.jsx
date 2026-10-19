
import { useViewStore } from '../../hooks/useViewStore.js';
import { runtimeStore } from '../../state/runtime-store.mjs';

export function TabPanel({ children, className = '', ...props }) {
  const view = useViewStore(runtimeStore);
  const analysis = props['data-agg-tab'];
  const active = analysis
    ? (view.activeAggTab || 'summary') === analysis
    : (view.activeTab || 'match') === props['data-tab'];
  const classes = className.split(/\s+/).filter(name => name && name !== 'active');
  return <div {...props} className={[...classes, active && 'active'].filter(Boolean).join(' ')}>{children}</div>;
}
