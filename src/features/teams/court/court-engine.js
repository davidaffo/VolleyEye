import { session as scoutUiState } from "../../state/scout-ui.js";
import { closeAttackTrajectoryModal } from "../../scout/trajectory-dialog.js";
import { cancelPartialSkillFlowForScope } from "../../scout/selection-state.js";
import { captureScoutActionSnapshot } from "../../events/history-model.js";
import { getCourtPlacementError, cacheAutoRoleBaseCourt, restoreAutoRoleBaseCourt, cleanCourtPlayers, registerLiberoPairForScope, roleToAutoCategory, enforceAutoLiberoForState, enforceAutoLiberoForScope, getUsedNamesForScope, resetAutoRoleCache, updateAutoRoleBaseCourtCache, setTeamCourt, prepareAutoRolePositioning } from "../court-state-model.js";
import { isLiberoForScope } from "../libero-model.js";
import { ensureCourtShapeFor, cloneCourtLineup } from "../court-model.js";
import { AUTO_LIBERO_ROLE_DEFAULT_VERSION, session as matchState } from "../../../../js/globals.js";
import { saveState } from "../../storage/save-state.js";
import { renderPlayers, renderOpponentPlayers } from "../../live/team-rendering.js";
import { renderLiberoBench } from "../../scout/court-commands.js";
import { updateRotationDisplay, updateOpponentRotationDisplay } from "../court-view.js";
import { getRoleLabelForRotation } from "../roles.js";
import { setTeamAutoLiberoRole, setTeamAutoLiberoBackline, setTeamLiberoAutoMap, getTeamPreferredLibero, setTeamPreferredLibero, getTeamPlayers, getTeamLiberos, getTeamCourt, buildNumbersForNames, syncOpponentPlayerNumbers } from "../roster-data.js";
import { replaceTeamPlayerNameReferences } from "../player-reference-model.js";
import { normalizePlayers } from "../../../domain/player-names.js";
import { session as rosterLineupState } from "../../state/roster-lineup.js";
import { recordSubstitutionEvent } from "../../video/video-events.js";
import { opponentRoster } from "../../../domain/opponent-roster.js";
import { parseDelimitedTeamText } from "../../../domain/roster-text.js";
import { publishReactSettings } from "../../settings/view.js";
import { createDomainState } from "../../../app/domain-state.mjs";

export const session = createDomainState({
"opponentSettings": () => (opponentRoster.createOpponentSettings({
      state: matchState.state,
      saveState,
      normalizePlayers,
      parseDelimitedTeamText: (...args) => parseDelimitedTeamText(...args),
      buildNumbersForNames,
      syncOpponentPlayerNumbers,
      renderOpponentPlayersList: publishReactSettings,
      renderOpponentLiberoTags: (...args) => renderLiberoBench(...args),
      onRenameReferences: (...args) => replaceTeamPlayerNameReferences("opponent", ...args)
    })),
"updateOpponentPlayersList": () => (courtEngineState.opponentSettings["updateOpponentPlayersList"]),
"addOpponentPlayer": () => (courtEngineState.opponentSettings["addOpponentPlayer"]),
"clearOpponentPlayers": () => (courtEngineState.opponentSettings["clearOpponentPlayers"]),
"handleOpponentNumberChange": () => (courtEngineState.opponentSettings["handleOpponentNumberChange"]),
"renameOpponentPlayerAtIndex": () => (courtEngineState.opponentSettings["renameOpponentPlayerAtIndex"]),
"removeOpponentPlayerAtIndex": () => (courtEngineState.opponentSettings["removeOpponentPlayerAtIndex"]),
"toggleOpponentLibero": () => (courtEngineState.opponentSettings["toggleOpponentLibero"]),
"setOpponentCaptain": () => (courtEngineState.opponentSettings["setOpponentCaptain"])
});
const courtEngineState = session;

export function setAutoRolePositioning(enabled) {
  const next = !!enabled;
  const prev = !!matchState.state.autoRolePositioning;
  matchState.state.autoRolePositioning = next;
  if (!next && prev) {
    const restored = restoreAutoRoleBaseCourt();
    const restoredOpp = restoreAutoRoleBaseCourt("opponent");
    saveState();
    if (restored) {
      renderPlayers();
      renderLiberoBench();

      updateRotationDisplay();
    } else {
      renderPlayers();
    }
    if (!restoredOpp) {
      renderOpponentPlayers();
    }
    return;
  }
  if (next && !prev) {
    cacheAutoRoleBaseCourt();
    cacheAutoRoleBaseCourt("opponent");
    applyAutoRolePositioning();
    saveState();
    return;
  }
  saveState();
  renderPlayers();
}

export function setAutoRoleP1American(enabled) {
  matchState.state.autoRoleP1American = !!enabled;
  saveState();
  if (matchState.state.autoRolePositioning) {
    applyAutoRolePositioning();
  }
}

export function setIsServing(flag) {
  matchState.state.isServing = !!flag;
  saveState();
}

export function setAutoLiberoRole(role, scope = "our") {
  if (typeof role !== "string") return;
  const sanitized = rosterLineupState.AUTO_LIBERO_ROLE_OPTIONS.includes(role) ? role : "";
  setTeamAutoLiberoRole(scope, sanitized);
  matchState.state.autoLiberoRoleDefaultVersion = AUTO_LIBERO_ROLE_DEFAULT_VERSION;
  setTeamAutoLiberoBackline(scope, sanitized !== "");
  setTeamLiberoAutoMap(scope, {});
  if (scope === "our" && Object.prototype.hasOwnProperty.call(matchState.state, "autoLiberoMap")) {
    matchState.state.autoLiberoMap = {};
  }
  enforceAutoLiberoForScope(scope, { skipServerOnServe: true });
  saveState();
  publishReactSettings();
  renderPlayers();
  renderLiberoBench();

}

export function swapPreferredLibero() {
  swapPreferredLiberoForScope("our");
}

export function swapPreferredLiberoForScope(scope = "our") {
  const players = getTeamPlayers(scope);
  const libs = getTeamLiberos(scope).filter(n => players.includes(n));
  if (libs.length < 2) return;
  const preferred = getTeamPreferredLibero(scope);
  const current = libs.includes(preferred) ? preferred : libs[0];
  const next = libs[(libs.indexOf(current) + 1) % libs.length];
  setTeamPreferredLibero(scope, next);
  setTeamLiberoAutoMap(scope, {});
  enforceAutoLiberoForScope(scope, { skipServerOnServe: true });
  saveState();
  renderPlayers();
  renderLiberoBench();

  renderOpponentPlayers();
}

export function restorePlayerFromLiberoForScope(posIdx, scope = "our") {
  const court = getTeamCourt(scope);
  const shaped = ensureCourtShapeFor(court);
  const idx = typeof posIdx === "number" ? posIdx : parseInt(posIdx, 10);
  if (isNaN(idx) || idx < 0 || idx >= shaped.length) return;
  const slot = shaped[idx] || { main: "", replaced: "" };
  if (!isLiberoForScope(slot.main, scope) || !slot.replaced) return;
  shaped[idx] = { main: slot.replaced, replaced: "" };
  setTeamCourt(scope, shaped);
  setTeamLiberoAutoMap(scope, {});
  const liberos = getTeamLiberos(scope);
  const currentPreferred = getTeamPreferredLibero(scope);
  const nextPreferred =
    currentPreferred && liberos.includes(currentPreferred) ? currentPreferred : liberos[0] || "";
  setTeamPreferredLibero(scope, nextPreferred);
  if (scope === "our" && matchState.state.autoRolePositioning) {
    updateAutoRoleBaseCourtCache(matchState.state.court);
    resetAutoRoleCache();
  }
  saveState();
  renderPlayers();
  renderLiberoBench();

  renderOpponentPlayers();
}

export function canPlaceInSlotForScope(name, posIdx, showAlert = true, scope = 'our') {
 const error = getCourtPlacementError(name, posIdx, scope);
 if (error && showAlert) alert(error);
 return !error;
}

export function commitCourtChange(baseCourt, options = {}) {
  const { clean = true } = options;
  if (clean) cleanCourtPlayers(baseCourt);
  cancelPartialSkillFlowForCourtChange(baseCourt, "our");
  resetAutoRoleCache();
  if (matchState.state.autoRolePositioning) {
    updateAutoRoleBaseCourtCache(baseCourt);
    matchState.state.court = ensureCourtShapeFor(baseCourt); // manteniamo il lineup base aggiornato
    enforceAutoLiberoForState({ skipServerOnServe: true });
    applyAutoRolePositioning();
    return;
  }
  matchState.state.court = ensureCourtShapeFor(baseCourt);
  enforceAutoLiberoForState({ skipServerOnServe: true });
  saveState();
  renderPlayers();
  renderLiberoBench();

  updateRotationDisplay();
}

export function commitCourtChangeForScope(baseCourt, scope = "our") {
  if (scope === "our") {
    commitCourtChange(baseCourt);
    return;
  }
  cancelPartialSkillFlowForCourtChange(baseCourt, scope);
  matchState.state.opponentCourt = ensureCourtShapeFor(baseCourt);
  if (matchState.state.autoRolePositioning) {
    updateAutoRoleBaseCourtCache(matchState.state.opponentCourt, "opponent");
  }
  if (typeof enforceAutoLiberoForScope === "function") {
    enforceAutoLiberoForScope("opponent", { skipServerOnServe: true });
  }
  saveState();
  renderOpponentPlayers();
  renderLiberoBench();
  updateOpponentRotationDisplay();
}

export function setCourtPlayer(posIdx, target, playerName) {
  setCourtPlayerForScope(posIdx, target, playerName, "our");
}

export function setCourtPlayerForScope(
  posIdx,
  target,
  playerName,
  scope = "our",
) {
  const baseCourt = ensureCourtShapeFor(getTeamCourt(scope));
  const name = (playerName || "").trim();
  if (!name || !getTeamPlayers(scope).includes(name)) return;
  if (!canPlaceInSlotForScope(name, posIdx, true, scope)) return;
  const slotState = baseCourt[posIdx] || { main: "", replaced: "" };
  const isLiberoHere = isLiberoForScope(slotState.main, scope);
  const replacedName = slotState.replaced || "";
  const prevMain = slotState.main || "";
  const shouldRecordSub =
    prevMain &&
    prevMain !== name &&
    !isLiberoForScope(prevMain, scope) &&
    !isLiberoForScope(name, scope) &&
    !getUsedNamesForScope(scope).has(name);
  if (isLiberoHere && replacedName === name && !isLiberoForScope(name, scope)) {
    const next = cloneCourtLineup(baseCourt);
    next[posIdx] = { main: name, replaced: "" };
    commitCourtChangeForScope(next, scope);
    return;
  }
  const actionSnapshot = shouldRecordSub ? captureScoutActionSnapshot() : null;
  let nextCourt = null;
  const liberos = getTeamLiberos(scope);

  nextCourt = rosterLineupState.lineupCore.setPlayerOnCourt({
    court: baseCourt,
    posIdx,
    playerName: name,
    liberos,
  });

  const placedSlot = nextCourt && nextCourt[posIdx];
  if (
    placedSlot &&
    isLiberoForScope(placedSlot.main, scope) &&
    placedSlot.replaced
  ) {
    registerLiberoPairForScope(placedSlot.replaced, placedSlot.main, scope);
    setTeamPreferredLibero(scope, placedSlot.main);
    const rotation =
      scope === "opponent"
        ? matchState.state.opponentRotation
        : matchState.state.rotation;
    const roleCat = roleToAutoCategory(
      getRoleLabelForRotation(posIdx + 1, rotation || 1),
    );
    if (roleCat) {
      setTeamAutoLiberoRole(scope, roleCat);
      setTeamAutoLiberoBackline(scope, true);
    }
  }
  commitCourtChangeForScope(nextCourt, scope);
  if (shouldRecordSub) {
    recordSubstitutionEvent({
      playerIn: name,
      playerOut: prevMain,
      teamScope: scope,
      actionSnapshot,
    });
  }
}

export function applyAutoRolePositioning() {
 if (!prepareAutoRolePositioning()) return;
 saveState();
 renderPlayers();
 renderLiberoBench();

 updateRotationDisplay();
}

export function cancelPartialSkillFlowForCourtChange(baseCourt, scope = "our") {
  const names = court => Array.from(new Set((court || []).flatMap(slot => [slot.main, slot.replaced]).filter(Boolean))).sort();
  const previous = names(getTeamCourt(scope));
  const next = names(baseCourt);
  if (previous.length === next.length && previous.every((name, idx) => name === next[idx])) return;
  cancelPartialSkillFlowForScope("our");
  cancelPartialSkillFlowForScope("opponent");
  if (scoutUiState.trajectoryResolver) closeAttackTrajectoryModal(null);
}
