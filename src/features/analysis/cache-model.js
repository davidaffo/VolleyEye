import { session as scoutUiState } from "../state/scout-ui.js";
import { session as skillAnalysisState } from "../state/analysis-skill-analysis.js";

export function invalidateSkillChartCaches() {
  skillAnalysisState.skillChartCacheRevision += 1;
  skillAnalysisState.skillChartSeriesCache.clear();
  skillAnalysisState.skillChartRenderToken += 1;
}

export function invalidateAnalysisEventCaches() {
  scoutUiState.analysisEventsCache = null;
  scoutUiState.analysisEventsCacheKey = "";
  scoutUiState.analysisEventsCacheRevision += 1;
  invalidateSkillChartCaches();
}

export function invalidateAnalysisCaches() {
  scoutUiState.analysisStatsCache = null;
  scoutUiState.analysisStatsScope = null;
  invalidateAnalysisEventCaches();
}
