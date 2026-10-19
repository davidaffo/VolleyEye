import { createDomainState } from "../../app/domain-state.mjs";

export const session = createDomainState({
"SKILL_CHART_METRICS": () => ([
  { id: "eff", label: "Eff % cumulativa", kind: "percent" },
  { id: "pos", label: "Pos % cumulativa", kind: "percent" },
  { id: "prf", label: "Prf % cumulativa", kind: "percent" },
  { id: "code", label: "Esito singolo (codice)", kind: "code" }
]),
"SKILL_CHART_CODE_VALUES": () => ({ "#": 2, "+": 1, "!": 0, "-": -1, "=": -2, "/": -2 }),
"skillChartToneColorCache": () => (null),
"skillChartRenderToken": () => (0),
"skillChartCacheRevision": () => (0),
"skillChartSeriesCache": () => (new Map()),
"skillChartRenderPaused": () => (false),
"skillChartRenderRefreshPending": () => (false)
});
const skillAnalysisState = session;
