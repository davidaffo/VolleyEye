
import { publishReactFloatingServeError } from "../archive/database-controls.js";
import { session as matchState } from "../../../js/globals.js";
import { getScoutCourtSkill, getMobileActiveScope } from "./flow-model.js";
import { updateSetTypeVisibility, updateNetBlockPrompt } from "./game-flow.js";
import { maybeScrollToActiveCourtOnMobile } from "../layout/modals.js";
import { publishReactSettings } from "../settings/view.js";
import { ensureMetricsConfigDefaults } from "../settings/rules.js";
import { updateOpponentRotationDisplay } from "../teams/court/court-ui-bootstrap.js";
import { recalcAllStatsAndUpdateUI } from "../analysis/stats-update.js";
import { publishReactLogServeTrajectories } from "../analysis/trajectory-view.js";
import { renderScoutCourt } from "../scout/court-commands.js";

export function renderPlayers() {
  publishReactSettings();
  syncCourtSideLayout();
  ensureMetricsConfigDefaults();
  const ourSkill = getScoutCourtSkill("our");
  const opponentSkill = getScoutCourtSkill("opponent");
  updateSetTypeVisibility(ourSkill || opponentSkill);
  renderScoutTeamCourt("our", { nextSkillId: ourSkill });
  renderScoutTeamCourt("opponent", { nextSkillId: opponentSkill });
  updateOpponentRotationDisplay();
  recalcAllStatsAndUpdateUI();

  updateNetBlockPrompt();
  publishReactLogServeTrajectories();
  const compact = !!matchState.state.forceMobileLayout || window.matchMedia("(max-width: 900px)").matches;
  publishReactFloatingServeError(compact);
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

    renderScoutCourt(scope, { hidden: !!hidden, compact, nextSkillId, animate });
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
