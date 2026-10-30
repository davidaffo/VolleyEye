import { renderDynamicFilter, toggleFilterVisibility } from "./filter-view.js";
import {
  getAnalysisExtraMatchState,
  saveAnalysisExtraMatchState,
  getAnalysisMatchOptions,
  getTeamFilterOptions,
  ensureAnalysisTeamFilterDefault,
  getAnalysisTeamScope,
  filterEventsByAnalysisTeam,
} from "./filter-model.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";

import { normalizeSetNumber, buildUniqueOptions } from "./values.js";
import { publishReactMultiscoutCount } from "./multiscout-view.js";

export function renderAnalysisTeamFilter() {
  
  ensureAnalysisTeamFilterDefault();
  const options = getTeamFilterOptions();
  analysisFiltersState.analysisTeamFilterState.teams = new Set(
    [...analysisFiltersState.analysisTeamFilterState.teams].filter((val) =>
      options.some((opt) => opt.value === val),
    ),
  );
  const visible = renderDynamicFilter(
    "analysis-filter-teams",
    options,
    analysisFiltersState.analysisTeamFilterState.teams,
    {
      changeAction: Object.freeze({
        command: "handleAnalysisTeamFilterChange",
      }),
    },
  );
  toggleFilterVisibility("analysis-filter-teams", visible);
  renderAnalysisMatchFilter();
}
export function renderAnalysisMatchFilter() {
  
  const scope = getAnalysisTeamScope();
  const options = getAnalysisMatchOptions(scope);
  const extraState = getAnalysisExtraMatchState();
  const selected = extraState[scope] || new Set();
  const filtered = new Set(
    [...selected].filter((key) => options.some((opt) => opt.value === key)),
  );
  extraState[scope] = filtered;
  saveAnalysisExtraMatchState(extraState);
  const visible = renderDynamicFilter(
    "analysis-filter-matches",
    options,
    filtered,
    {
      changeAction: Object.freeze({
        command: "handleAnalysisMatchFilterChange",
      }),
    },
  );
  toggleFilterVisibility("analysis-filter-matches", visible);
  publishReactMultiscoutCount();
}
export function renderAnalysisSummarySetFilter() {
  
  const events = filterEventsByAnalysisTeam();
  const setOpts = buildUniqueOptions(
    events.map((ev) => normalizeSetNumber(ev.set)),
    {
      asNumber: true,
      labelFn: (val) => "Set " + val,
    },
  );
  analysisFiltersState.analysisSummaryFilterState.sets = new Set(
    [...analysisFiltersState.analysisSummaryFilterState.sets].filter((val) =>
      setOpts.some((opt) => Number(opt.value) === val),
    ),
  );
  const visible = renderDynamicFilter(
    "analysis-filter-sets",
    setOpts,
    analysisFiltersState.analysisSummaryFilterState.sets,
    {
      changeAction: Object.freeze({
        command: "handleAnalysisSummarySetFilterChange",
      }),
    },
  );
  toggleFilterVisibility("analysis-filter-sets", visible);
}
