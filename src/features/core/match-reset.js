import { resetMatchVideoState } from "../video/reset-model.js";
import { resetMatchVideoPlayback } from "../video/reset-commands.js";
import { stripCourtReplacements } from "../../domain/player-names.js";
import { ensureMatchDefaults, getTodayIso } from "../teams/match-details.js";
import { session as matchState } from "../../../js/globals.js";
import { getSelectedTeamDefaultSettings, getSelectedOpponentTeamDefaultSettings } from "../teams/storage/team-repository.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { applyDefaultLineup, applyOpponentDefaultLineup } from "../teams/lineup-commands.js";
import { enforceAutoLiberoForState, initStats } from "../teams/court-state-model.js";
import { saveState } from "../storage/save-state.js";
import { renderMatchesSelect } from "./app-lifecycle.js";
import { updateRotationDisplay } from "../teams/court-view.js";
import { resetSetTypeState } from "../live/flow-model.js";
import { renderEventsLog } from "../events/log-view.js";
import { recalcAllStatsAndUpdateUI } from "../analysis/stats-update.js";
import { renderPlayers } from "../live/team-rendering.js";

export function resetMatchState(options = {}) {
  const { skipMatchesRender = false } = options || {};
  const preservedCourt = matchState.state.court ? stripCourtReplacements(matchState.state.court) : Array.from({ length: 6 }, () => ({ main: "" }));
  const preservedRotation = matchState.state.rotation || 1;
  const preservedServing = !!matchState.state.isServing;
  const preservedAutoRoleCourt = Array.isArray(matchState.state.autoRoleBaseCourt)
    ? stripCourtReplacements(matchState.state.autoRoleBaseCourt)
    : [];
  const preservedPreferredLibero = matchState.state.preferredLibero || "";
  const preservedOpponentCourt = Array.isArray(matchState.state.opponentCourt)
    ? stripCourtReplacements(matchState.state.opponentCourt)
    : Array.from({ length: 6 }, () => ({ main: "" }));
  const preservedOpponentRotation = matchState.state.opponentRotation || 1;
  resetSetTypeState();
  const preservedTeamName = matchState.state.selectedTeam || (matchState.state.match && matchState.state.match.teamName) || "";
  matchState.state.match = {
    teamName: preservedTeamName,
    opponent: "",
    category: "",
    date: getTodayIso(),
    leg: "",
    matchType: "amichevole"
  };
  matchState.state.events = [];
  matchState.state.stats = {};
  const defaults = getSelectedTeamDefaultSettings();
  if (defaults && defaults.defaultLineup && defaults.defaultLineup.length > 0) {
    applyDefaultLineup(defaults.defaultLineup, defaults.defaultRotation || 1);
  } else {
    matchState.state.court = preservedCourt;
    rosterLineupState.autoRoleBaseCourt = preservedAutoRoleCourt.length ? [...preservedAutoRoleCourt] : null;
    matchState.state.autoRoleBaseCourt = preservedAutoRoleCourt;
    matchState.state.rotation = preservedRotation;
  }
  const opponentDefaults = getSelectedOpponentTeamDefaultSettings();
  if (matchState.state.useOpponentTeam && opponentDefaults && opponentDefaults.defaultLineup && opponentDefaults.defaultLineup.length > 0) {
    applyOpponentDefaultLineup(opponentDefaults.defaultLineup, opponentDefaults.defaultRotation || 1);
  } else {
    matchState.state.opponentCourt = preservedOpponentCourt;
    matchState.state.opponentRotation = preservedOpponentRotation;
  }
  matchState.state.isServing = preservedServing;
  matchState.state.currentSet = 1;
  matchState.state.setResults = {};
  matchState.state.setStarts = {};
  matchState.state.matchFinished = false;

  matchState.state.scoreOverrides = {};
  matchState.state.autoRotatePending = false;
  matchState.state.opponentAutoRotatePending = false;
  matchState.state.skillFlowOverride = null;
  matchState.state.opponentSkillFlowOverride = null;
  matchState.state.freeballPending = false;
  matchState.state.freeballPendingScope = "our";
  matchState.state.flowTeamScope = preservedServing ? "our" : "opponent";
  matchState.state.pendingServe = null;
  matchState.state.forceSkillActive = false;
  matchState.state.forceSkillScope = null;
  matchState.state.matchEndSetSnapshot = null;
  matchState.state.matchEndSetRecorded = null;
  matchState.state.liberoAutoMap = {};
  matchState.state.preferredLibero = preservedPreferredLibero;
  matchState.state.courtViewMirrored = false;
  matchState.state.skillClock = { paused: true, pausedAtMs: null, pausedAccumMs: 0, lastEffectiveMs: 0 };
  resetMatchVideoState();
  resetMatchVideoPlayback({ includeScout: false });

  enforceAutoLiberoForState({ skipServerOnServe: true });
  initStats();
  saveState();
  recalcAllStatsAndUpdateUI();
  renderEventsLog();
  renderPlayers();
  updateRotationDisplay();
  ensureMatchDefaults();
  if (!skipMatchesRender) {
    renderMatchesSelect();
  }
}
