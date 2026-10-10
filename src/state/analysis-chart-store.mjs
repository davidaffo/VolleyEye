let snapshot = Object.freeze({
  global: Object.freeze({ metric: "eff", charts: [], empty: "" }),
  player: Object.freeze({ metric: "eff", charts: [], empty: "" }),
  modal: Object.freeze({
    open: false,
    title: "",
    items: [],
    codes: [],
    metric: "eff",
    chart: null,
  }),
});
const listeners = new Set();
export const analysisChartStore = {
  getSnapshot: () => snapshot,
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  publish(kind, patch) {
    snapshot = Object.freeze({
      ...snapshot,
      [kind]: Object.freeze({ ...snapshot[kind], ...patch }),
    });
    listeners.forEach((listener) => listener());
  },
};
