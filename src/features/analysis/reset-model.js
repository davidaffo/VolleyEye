import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { clearFilterSelections } from "../../domain/filter-selections.js";
import { ensureAnalysisTeamFilterDefault } from "./filter-model.js";
import { invalidateAnalysisCaches } from "./cache-model.js";

export function resetAnalysisForMatch() {
  // Filters contain roster indices and set numbers belonging to the old match.
  const filters = [
    analysisFiltersState.analysisTeamFilterState,
    analysisFiltersState.analysisSummaryFilterState,
    analysisFiltersState.trajectoryFilterState,
    analysisFiltersState.serveTrajectoryFilterState,
    analysisFiltersState.playerTrajectoryFilterState,
    analysisFiltersState.playerServeTrajectoryFilterState,
    analysisFiltersState.secondFilterState,
    analysisFiltersState.playerSecondFilterState,
    analysisFiltersState.videoFilterState,
  ];
  filters.forEach(clearFilterSelections);
  analysisFiltersState.activeVideoFilterPresetId = null;
  scoutUiState.aggTableView = { mode: "summary", skillId: null, playerIdx: null };
  ensureAnalysisTeamFilterDefault();
  invalidateAnalysisCaches();
}

