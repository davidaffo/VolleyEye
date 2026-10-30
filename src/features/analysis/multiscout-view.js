import { session as matchState } from "../../../js/globals.js";
import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
import {
  getAnalysisExtraMatchState,
  getAnalysisMatchOptions,
  saveAnalysisExtraMatchState,
  getCurrentMatchLabel,
} from "./filter-model.js";
import { getTeamNameForScope } from "../teams/selectors.js";
import { multiscoutStore } from "../../state/roster-import-store.mjs";
import { session as scoutUiState } from "../state/scout-ui.js";
import { publishReactFilter } from "./filter-view.js";
export function getReactMultiscoutScope() {
  return matchState.state.useOpponentTeam &&
    analysisFiltersState.multiscoutTeamScope === "opponent"
    ? "opponent"
    : "our";
}

export function publishReactMultiscoutCount() {
  const scope = getReactMultiscoutScope(),
    extra = getAnalysisExtraMatchState();
  multiscoutStore.publish({ count: extra[scope]?.size || 0 });
}

export function publishReactMultiscout(onChange) {
  const scope = getReactMultiscoutScope(),
    options = getAnalysisMatchOptions(scope),
    extra = getAnalysisExtraMatchState(),
    selected = extra[scope] || new Set(),
    filtered = new Set(
      [...selected].filter((key) =>
        options.some((option) => option.value === key),
      ),
    );
  extra[scope] = filtered;
  saveAnalysisExtraMatchState(extra);
  const teams = matchState.state.useOpponentTeam
    ? [
        { value: "our", label: getTeamNameForScope("our") || "Squadra" },
        {
          value: "opponent",
          label: getTeamNameForScope("opponent") || "Avversaria",
        },
      ]
    : [{ value: "our", label: getTeamNameForScope("our") || "Squadra" }];
  const pieces = [],
    match = getCurrentMatchLabel(),
    team = getTeamNameForScope(scope);
  if (match) pieces.push("Match: " + match);
  if (team) pieces.push("Squadra: " + team);
  multiscoutStore.publish({
    scope,
    teams: Object.freeze(teams.map(Object.freeze)),
    subtitle: pieces.length ? pieces.join(" · ") : "Match corrente",
  });
  publishReactFilter(scoutUiState.elMultiscoutList, options, filtered, {
    onChange: () => onChange(scoutUiState.elMultiscoutList, scope),
  });
  publishReactMultiscoutCount();
}
