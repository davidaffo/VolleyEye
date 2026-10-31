import { session } from "../state/live-trajectories.js";
import { getTeamScopeFromEvent, isFarSideForScope } from "../teams/selectors.js";
import { session as matchState } from "../../../js/globals.js";
import { cancelPartialSkillFlowForScope } from "../scout/selection-state.js";
import { renderServeTrajectoryAnalysis } from "../analysis/trajectory-rendering.js";
import { saveState } from "../storage/save-state.js";
import { renderEventsLog } from "../events/log-view.js";
import { renderVideoAnalysis } from "../video/playback.js";
import { enforceAutoLiberoForState } from "../teams/court-state-model.js";
import { renderPlayers } from "./team-rendering.js";
import { updateNextSkillIndicator } from "../scout/flow-view.js";
import { getNetBlockPromptScope } from "./flow-model.js";
import { session as teamManagementState } from "../state/live-team-management.js";
import { openAttackTrajectoryModal } from "../scout/trajectory-dialog.js";

const trajectoriesState = session;















export async function captureServeTrajectory(event, { forcePopup = false } = {}) {
  try {
    const scope = getTeamScopeFromEvent(event);
    const forceFar = forcePopup ? false : isFarSideForScope(scope);
    const startRes = await openAttackTrajectoryModal({
      mode: "serve-start",
      start: event.serveStart || null,
      forcePopup,
      forceFar,
      scope
    });
    if (startRes && startRes.serveType) {
      event.serveType = startRes.serveType;
    }
    if (startRes && startRes.point) {
      event.serveStart = startRes.point;
    }
    const endRes = await openAttackTrajectoryModal({
      mode: "serve-end",
      end: event.serveEnd || null,
      forcePopup,
      forceFar,
      scope
    });
    if (endRes && endRes.point) {
      event.serveEnd = endRes.point;
    }
  } catch (err) {
    console.error("Errore cattura traiettoria servizio", err);
  } finally {
    saveState();
    renderEventsLog({ suppressScroll: true });
    renderVideoAnalysis();
    renderServeTrajectoryAnalysis();
  }
}

export function forceNextSkill(skillId, scope = "our") {
  if (!skillId) return;
  cancelPartialSkillFlowForScope(scope);
  matchState.state.predictiveSkillFlow = true;
  matchState.state.freeballPending = false;
  matchState.state.freeballPendingScope = scope;
  matchState.state.skillFlowOverride = null;
  matchState.state.opponentSkillFlowOverride = null;
  matchState.state.pendingServe = null;
  matchState.state.forceSkillActive = true;
  matchState.state.forceSkillScope = scope;
  if (scope === "opponent") {
    matchState.state.opponentSkillFlowOverride = skillId;
  } else {
    matchState.state.skillFlowOverride = skillId;
  }
  matchState.state.flowTeamScope = scope;
  if (scope === "our") {
    if (skillId === "serve" && !matchState.state.isServing) {
      matchState.state.isServing = true;
      matchState.state.autoRotatePending = false;
      enforceAutoLiberoForState({ skipServerOnServe: true });
    }
    if (skillId === "pass") {
      matchState.state.isServing = false;
      matchState.state.autoRotatePending = true;
      matchState.state.freeballPending = false;
      enforceAutoLiberoForState({ skipServerOnServe: true });
    }
  }
  saveState({ persistLocal: true });
  renderPlayers();
  updateNextSkillIndicator(skillId);
  const toggle = document.getElementById("predictive-skill-toggle");

}

export function triggerNetBlockPrompt() {
  const scope = (teamManagementState.elBtnNetBlockPrompt && teamManagementState.elBtnNetBlockPrompt.dataset.scope) || getNetBlockPromptScope();
  if (!scope) return;
  forceNextSkill("block", scope);
}
