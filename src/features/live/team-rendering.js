import { publishReactFloatingServeError, publishReactSetTypeShortcuts } from "../scout/shortcut-view.js";
import { session as matchState } from "../../../js/globals.js";
import { getScoutCourtSkill, getMobileActiveScope } from "./flow-model.js";
import { updateSetTypeVisibility, updateNetBlockPrompt } from "../scout/flow-view.js";
import { maybeScrollToActiveCourtOnMobile } from "../layout/modals.js";
import { publishReactSettings } from "../settings/view.js";
import { ensureMetricsConfigDefaults } from "../settings/rules.js";
import { updateOpponentRotationDisplay } from "../teams/court-view.js";
import { recalcAllStatsAndUpdateUI } from "../analysis/stats-update.js";
import { publishReactLogServeTrajectories } from "../analysis/trajectory-view.js";
import { renderScoutCourt } from "../scout/court-commands.js";
import { scheduleVideoSafeRender } from "../video/media-state.js";
import { normalizeSetTypeValue } from "../../domain/skill-values.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { saveState } from "../storage/save-state.js";
import { makePlayerKey } from "../teams/selectors.js";
import { startAttackSelection } from "../scout/selection-flow.js";

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

    renderScoutCourt(scope, { hidden: !!hidden, compact, nextSkillId, animate,
      effects: { onRender: renderPlayers, onScheduleRender: scheduleRenderPlayers, onQueuedAttack: startQueuedSetterAttack },
    });
    return;

}

export function syncCourtSideLayout() {
  const courtArea = document.getElementById("court-area");
  const opponentPanel = document.querySelector('[data-team-panel="opponent"]');
  const homePanel = document.querySelector('[data-team-panel="home"]');
  if (opponentPanel) opponentPanel.classList.toggle("hidden", !matchState.state.useOpponentTeam);
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

export function scheduleRenderPlayers() {
  scheduleVideoSafeRender(renderPlayers);
}

export function setNextSetType(val) {
  const normalized = normalizeSetTypeValue(val) || "";
  if (!normalized) {
    scoutUiState.queuedSetTypeChoice = null;
  }
  matchState.state.nextSetType = normalized;
  saveState();
  publishReactSetTypeShortcuts();
  // Aggiorna subito le card/skill aperte per mostrare il nuovo tipo alzata
  renderPlayers();
}

export function startQueuedSetterAttack({ playerIdx, scope }, choice) {
  const key = makePlayerKey(scope, playerIdx);
  scoutUiState.queuedSetTypeChoice = null;
  setNextSetType("");
  startAttackSelection(
    playerIdx,
    choice,
    () => {
      if (scoutUiState.attackMetaByPlayer[key])
        scoutUiState.attackMetaByPlayer[key].fromNextSetType = true;
      renderPlayers();
    },
    scope,
  );
}
