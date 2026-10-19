import { createKeyedViewStore } from './view-store.mjs';

export const analysisChartStore = createKeyedViewStore({
  global: { metric: 'eff', charts: [], empty: '' },
  player: { metric: 'eff', charts: [], empty: '' },
  modal: { open: false, title: '', items: [], codes: [], metric: 'eff', chart: null },
}, {}, { merge: true });
