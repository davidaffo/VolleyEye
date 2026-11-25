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
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { getDefaultAnalysisTeamScope } from "./filter-model.js";

import { normalizeSetNumber, buildUniqueOptions } from "./values.js";
import { publishReactMultiscoutCount } from "./multiscout-view.js";
import { pruneFilterSelections } from '../../domain/filter-selections.js';

export function renderAnalysisTeamFilter() {
  
  ensureAnalysisTeamFilterDefault();
  const options = getTeamFilterOptions();
  analysisFiltersState.analysisTeamFilterState.teams = new Set(
    [...analysisFiltersState.analysisTeamFilterState.teams].filter((val) =>
      options.some((opt) => opt.value === val),
    ),
  );
  const teams = analysisFiltersState.analysisTeamFilterState.teams;
  const summary = rosterLineupState.activeAggTab === "summary";
  if ((!summary || options.length === 1) && teams.size !== 1) {
    analysisFiltersState.analysisTeamFilterState.teams = new Set([getDefaultAnalysisTeamScope()]);
  }
  const selected = analysisFiltersState.analysisTeamFilterState.teams;
  const radioOptions = summary && options.length > 1
    ? [...options, { value: "both", label: "Entrambe" }]
    : options;
  const visible = renderDynamicFilter(
    "analysis-filter-teams",
    radioOptions,
    selected.size === 0 ? new Set(["both"]) : selected,
    {
      type: "radio",
      name: "analysis-team",
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
  pruneFilterSelections(analysisFiltersState.analysisSummaryFilterState, [['sets', setOpts, true]]);
  const visible = renderDynamicFilter(
    "analysis-filter-sets",
    setOpts,
    analysisFiltersState.analysisSummaryFilterState.sets,
    {
      triState: true,
      changeAction: Object.freeze({
        command: "handleAnalysisSummarySetFilterChange",
      }),
    },
  );
  toggleFilterVisibility("analysis-filter-sets", visible);
}
