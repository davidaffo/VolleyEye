import { renderAnalysisTeamFilter } from "./shared-filter-view.js";
import { getAnalysisTeamScope, getAnalysisCourtSide } from "./filter-model.js";
import { renderAnalysisCourtSideRadios, getCheckedRadioValue } from "./filter-view.js";
import { saveState } from "../storage/save-state.js";
import { renderPlayerAnalysisSkillCharts } from "./skill-analysis.js";
import { renderPlayerTrajectoryAnalysis, renderPlayerServeTrajectoryAnalysis } from "./player-trajectories.js";
import { renderPlayerSecondTable } from "./player-second-distribution.js";
import { ensurePlayerAnalysisState } from "./player-model.js";
import { session as matchState } from "../../../js/globals.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { setModalOpenState } from "../layout/modals.js";

import { publishReactPlayerAnalysis } from "./player-view.js";
import { publishReactAggSkillModal, setReactAggSkillOpen } from "./charts-view.js";

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

export function resetAggTableView() {
  scoutUiState.aggTableView = {
    mode: "summary",
    skillId: null,
    playerIdx: null,
  };
}

export function renderPlayerAnalysis() {

  renderAnalysisTeamFilter();
  const prefs = ensurePlayerAnalysisState();
  const scope = getAnalysisTeamScope();
  renderAnalysisCourtSideRadios(
      "player-analysis-court-side",
      getAnalysisCourtSide(prefs.courtSideByScope[scope]),
      () => {
        prefs.courtSideByScope[getAnalysisTeamScope()] = getAnalysisCourtSide(
          getCheckedRadioValue("player-analysis-court-side"),
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

export function openAggSkillModal(skillId, playerIdx) {
  if (!matchState.elAggSkillModal || !matchState.elAggSkillModalBody) return;
  publishReactAggSkillModal(skillId, playerIdx);
  setReactAggSkillOpen(true);
  setModalOpenState(true);
}

export function closeAggSkillModal() {
  if (!matchState.elAggSkillModal) return;
  setReactAggSkillOpen(false);
  setModalOpenState(false);
}
