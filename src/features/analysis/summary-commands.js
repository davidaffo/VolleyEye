import { resetAggTableView } from "./skill-tables.js";
import { openSetStartEditor } from "../live/lineup-editor.js";

import { session as analysisFiltersState } from "../state/analysis-analysis-filters.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { ensurePlayerAnalysisState } from "./player-model.js";
import { renderAggregatedTable } from "./aggregated-table.js";
import { renderPlayerAnalysis } from "./skill-tables.js";
import { saveState } from "../storage/save-state.js";
import { setActiveAggTab } from "../core/app-lifecycle.js";

export function openReactAggregatedSkill(skillId, scope, chooseTeam = false) {
  if (chooseTeam)
    analysisFiltersState.analysisTeamFilterState.teams = new Set([scope]);
  scoutUiState.aggTableView = { mode: "skill", skillId, playerIdx: null };
  renderAggregatedTable();
}

export function openReactAggregatedPlayer(index, scope, chooseTeam = false) {
  if (chooseTeam)
    analysisFiltersState.analysisTeamFilterState.teams = new Set([scope]);
  ensurePlayerAnalysisState().playerIdx = index;
  saveState();
  setActiveAggTab("player");
  renderPlayerAnalysis();
}

export function showAggregatedSummary() {
  resetAggTableView();
  renderAggregatedTable();
}

export function openAggregatedSetStart(setNum, scope) {
  openSetStartEditor(
    setNum,
    scope ||
      (analysisFiltersState.analysisTeamFilterState.teams?.has("opponent")
        ? "opponent"
        : "our"),
  );
}
