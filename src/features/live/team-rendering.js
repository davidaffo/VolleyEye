
import { publishReactFloatingServeError } from "../archive/database-controls.js";
import { session as matchState } from "../../../js/globals.js";
import { getPredictedSkillId, getPredictedSkillIdForScope, getLastFlowEvent, getMobileActiveScope } from "./flow-model.js";
import { updateSetTypeVisibility, updateNetBlockPrompt } from "./game-flow.js";
import { isServingForScope, isSkillEnabledForScope, getEnabledSkillsForScope } from "../teams/selectors.js";
import { maybeScrollToActiveCourtOnMobile } from "../layout/modals.js";
import { syncAutoLiberoSelects } from "../teams/court/court-engine.js";
import { ensureMetricsConfigDefaults } from "../settings/rules.js";
import { updateOpponentRotationDisplay, renderLineupChips } from "../teams/court/court-ui-bootstrap.js";
import { recalcAllStatsAndUpdateUI } from "../analysis/stats-update.js";
import { renderLogServeTrajectories } from "../analysis/trajectory-rendering.js";
import { publishScoutCourtView } from "../scout/court-view.js";

export function updateFloatingServeErrorButton(isCompactMobile) {

 publishReactFloatingServeError(isCompactMobile); return;
}

export function getScoutCourtSkill(scope) {
  if (scope === "opponent" && !matchState.state.useOpponentTeam) return null;
  const predicted = scope === "our" && !matchState.state.useOpponentTeam
    ? getPredictedSkillId()
    : getPredictedSkillIdForScope(scope);
  if (predicted || !matchState.state.predictiveSkillFlow) return predicted;
  if (!matchState.state.useOpponentTeam) {
    const ownEvents = (matchState.state.events || []).filter(event => event && event.team !== "opponent");
    if (getLastFlowEvent(ownEvents)) return null;
  }
  const fallback = isServingForScope(scope) ? "serve" : "pass";
  if (isSkillEnabledForScope(fallback, scope)) return fallback;
  const enabled = getEnabledSkillsForScope(scope);
  return enabled.length ? enabled[0].id : null;
}

export function renderPlayers() {
  syncAutoLiberoSelects();
  syncCourtSideLayout();
  ensureMetricsConfigDefaults();
  const ourSkill = getScoutCourtSkill("our");
  const opponentSkill = getScoutCourtSkill("opponent");
  updateSetTypeVisibility(ourSkill || opponentSkill);
  renderScoutTeamCourt("our", { nextSkillId: ourSkill });
  renderScoutTeamCourt("opponent", { nextSkillId: opponentSkill });
  updateOpponentRotationDisplay();
  recalcAllStatsAndUpdateUI();
  renderLineupChips();
  updateNetBlockPrompt();
  renderLogServeTrajectories();
  const compact = !!matchState.state.forceMobileLayout || window.matchMedia("(max-width: 900px)").matches;
  updateFloatingServeErrorButton(compact);
  maybeScrollToActiveCourtOnMobile();
}

export function renderOpponentPlayers(options = {}) {
  syncCourtSideLayout();
  updateOpponentRotationDisplay();
  renderScoutTeamCourt("opponent", options);
}

export function renderScoutTeamCourt(scope, { nextSkillId = null, animate = false } = {}) {
  const container = document.getElementById(scope === "opponent" ? "opponent-players-container" : "players-container");
  if (!container) return;
  const compact = !!matchState.state.forceMobileLayout || window.matchMedia("(max-width: 900px)").matches;
  const activeScope = compact ? getMobileActiveScope() : null;
  const hidden = (scope === "opponent" && !matchState.state.useOpponentTeam) || (activeScope && activeScope !== scope);

    publishScoutCourtView(scope, { hidden: !!hidden, compact, nextSkillId, animate });
    return;

}

export function syncCourtSideLayout() {
  const courtArea = document.getElementById("court-area");
  const opponentPanel = document.querySelector('[data-team-panel="opponent"]');
  const homePanel = document.querySelector('[data-team-panel="home"]');
  const swapped = !!matchState.state.courtSideSwapped;
  const homeIsFar = swapped;
  const opponentIsFar = !swapped;
  matchState.state.courtViewMirrored = homeIsFar;
  matchState.state.opponentCourtViewMirrored = opponentIsFar;
  if (courtArea) {
    courtArea.classList.toggle("court-area--swapped", swapped);
  }
  if (opponentPanel) {
    opponentPanel.classList.toggle("team-panel--far", !swapped);
    opponentPanel.classList.toggle("team-panel--near", swapped);
  }
  if (homePanel) {
    homePanel.classList.toggle("team-panel--far", swapped);
    homePanel.classList.toggle("team-panel--near", !swapped);
  }
}

