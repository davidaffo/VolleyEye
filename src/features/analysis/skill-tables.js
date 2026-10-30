import { renderAnalysisTeamFilter } from "./analysis-filters.js";
import { getAnalysisTeamScope, getAnalysisCourtSide } from "./filter-model.js";
import {
  renderAnalysisCourtSideRadios,
  getCheckedRadioValue,
} from "./filter-view.js";
import { saveState } from "../storage/save-state.js";
import { renderPlayerAnalysisSkillCharts } from "./skill-analysis.js";
import {
  renderPlayerTrajectoryAnalysis,
  renderPlayerServeTrajectoryAnalysis,
} from "./player-trajectories.js";
import { renderPlayerSecondTable } from "./player-second-distribution.js";
import { ensurePlayerAnalysisState } from "./player-model.js";

import { session as matchState } from "../../../js/globals.js";
import { session as scoutUiState } from "../state/scout-ui.js";

import { setModalOpenState } from "../layout/modals.js";

import { session as rosterLineupState } from "../state/roster-lineup.js";

import { publishReactPlayerAnalysis } from "./player-view.js";
import {
  publishReactAggSkillModal,
  setReactAggSkillOpen,
} from "./charts-view.js";

export function setSelectedErrorType(typeId, container) {
  scoutUiState.selectedErrorType = typeId || "Generic";
  if (!container) return;
  const buttons = container.querySelectorAll("[data-error-type]");
  buttons.forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.dataset.errorType === scoutUiState.selectedErrorType,
    );
  });
}

export function getAggTableElements() {
  const table = rosterLineupState.elAggTableBody
    ? rosterLineupState.elAggTableBody.closest("table")
    : null;
  const thead = table ? table.querySelector("thead") : null;
  return { table, thead };
}

export function resetAggTableView() {
  scoutUiState.aggTableView = {
    mode: "summary",
    skillId: null,
    playerIdx: null,
  };
}

export function getSkillIdFromHeader(th) {
  if (!th || !th.classList) return null;
  if (th.classList.contains("skill-serve")) return "serve";
  if (th.classList.contains("skill-pass")) return "pass";
  if (th.classList.contains("skill-freeball")) return "freeball";
  if (th.classList.contains("skill-attack")) return "attack";
  if (th.classList.contains("skill-block")) return "block";
  if (th.classList.contains("skill-defense")) return "defense";
  return null;
}

export function applySkillClassToCells(cells, skillId, startIndex = 0) {
  if (!skillId) return;
  cells.forEach((td, idx) => {
    if (idx < startIndex) return;
    td.classList.add("skill-col", "skill-" + skillId);
  });
}

export function renderPlayerAnalysis() {
  if (!rosterLineupState.elPlayerAnalysisBody) return;
  renderAnalysisTeamFilter();
  const prefs = ensurePlayerAnalysisState();
  const scope = getAnalysisTeamScope();
  if (rosterLineupState.elPlayerAnalysisCourtSide)
    renderAnalysisCourtSideRadios(
      rosterLineupState.elPlayerAnalysisCourtSide,
      getAnalysisCourtSide(prefs.courtSideByScope[scope]),
      () => {
        prefs.courtSideByScope[getAnalysisTeamScope()] = getAnalysisCourtSide(
          getCheckedRadioValue(rosterLineupState.elPlayerAnalysisCourtSide),
        );
        saveState();
        renderPlayerAnalysis();
      },
      "analysis-player-court-side",
    );

  const { compare } = publishReactPlayerAnalysis();
  if (compare) return;
  renderPlayerAnalysisSkillCharts();
  if (prefs.showAttack) renderPlayerTrajectoryAnalysis();
  if (prefs.showServe) renderPlayerServeTrajectoryAnalysis();
  if (prefs.showSecond) renderPlayerSecondTable();
}

export function renderAggSkillModal(skillId, playerIdx) {
  publishReactAggSkillModal(skillId, playerIdx);
  return;
}

export function openAggSkillModal(skillId, playerIdx) {
  if (!matchState.elAggSkillModal || !matchState.elAggSkillModalBody) return;
  renderAggSkillModal(skillId, playerIdx);
  setReactAggSkillOpen(true);
  setModalOpenState(true);
}

export function closeAggSkillModal() {
  if (!matchState.elAggSkillModal) return;
  setReactAggSkillOpen(false);
  setModalOpenState(false);
}
