import { DEFAULT_CHART_TONES } from "./chart-model.js";
import { session as skillAnalysisState } from "../state/analysis-skill-analysis.js";
export function getSkillChartToneColors() {
  if (skillAnalysisState.skillChartToneColorCache)
    return skillAnalysisState.skillChartToneColorCache;
  const fallback = DEFAULT_CHART_TONES;
  let host;
  try {
    host = document.createElement("div");
    host.style.cssText =
      "position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;";
    const mk = (cls) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `metric-toggle ${cls} active`;
      el.textContent = "•";
      host.appendChild(el);
      return el;
    };
    const posEl = mk("code-positive");
    const neuEl = mk("code-neutral");
    const negEl = mk("code-negative");
    document.body.appendChild(host);
    const pos = getComputedStyle(posEl).borderColor || fallback.positive;
    const neu = getComputedStyle(neuEl).borderColor || fallback.neutral;
    const neg = getComputedStyle(negEl).borderColor || fallback.negative;
    skillAnalysisState.skillChartToneColorCache = {
      positive: pos,
      neutral: neu,
      negative: neg,
    };
    return skillAnalysisState.skillChartToneColorCache;
  } catch (_err) {
    skillAnalysisState.skillChartToneColorCache = fallback;
    return skillAnalysisState.skillChartToneColorCache;
  } finally {
    host?.remove();
  }
}
