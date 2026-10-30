import { rotateCourtState, prepareAutoRolePositioning, playersChanged, ensureCourtShape, cleanCourtPlayers, resetAutoRoleCache, getLockedMapForScope } from "../court-state-model.js";


import { getRoleLabelForRotation } from "../roles.js";
import { normalizePlayers } from "../../../domain/player-names.js";
import { buildNumbersForNames, setTeamPreferredLibero, getTeamCourt, getTeamLiberos, formatNameWithNumberFor, formatNameWithNumber } from "../roster-data.js";
import { applyDefaultLineup } from "../core/player-model.js";

import { renderPlayersManagerList, canPlaceInSlotForScope, setCourtPlayerForScope, commitCourtChangeForScope } from "./court-engine.js";

import { isLiberoForScope } from "../libero-model.js";
import { ensureCourtShapeFor } from "../court-model.js";
import { hasMatchDataForReset, renderTeamsSelect } from "../storage/match-repository.js";
import { session as matchState } from "../../../../js/globals.js";
import { sanitizeRosterIsolation } from "../core/state-store.js";
import { saveState } from "../../storage/save-state.js";
import { resetSetTypeState } from "../../live/game-flow.js";
import { session as rosterLineupState } from "../../state/roster-lineup.js";
import { ensureMetricsConfigDefaults } from "../../settings/rules.js";
import { renderPlayers, renderOpponentPlayers } from "../../live/team-rendering.js";
import { renderLiberoTags } from "../imports/camp3-import.js";
import { renderMetricsConfig } from "../settings/metrics-editor.js";
import { renderEventsLog } from "../../video/video-events.js";
import { renderAggregatedTable } from "../../analysis/aggregated-table.js";
import { renderLiberoBench } from "../../scout/court-commands.js";
import { renderLiveScore } from "../../live/live-score-and-set.js";
import { setReactSettingsOpen } from "../../settings/view.js";
import { setGlobalModalState } from "../../layout/modals.js";
import { listenRuntime } from "../../../app/browser-effects.js";

export function updatePlayersList(newPlayers, options = {}) {
  const {
    askReset = true,
    liberos = null,
    playerNumbers = null,
    captains = null,
    setDefaultLineup = false,
    defaultLineupNames = null,
    defaultLineupRotation = null,
    preserveCourt = false,
    preferredLibero = null,
    preserveFlowState = false
  } = options;
  const normalized = normalizePlayers(newPlayers);
  const changed = playersChanged(normalized);
  if (changed && askReset && hasMatchDataForReset()) {
    alert(
      "Il roster non può essere sostituito durante lo scout. Usa Modifica rapida per aggiungere o correggere giocatrici."
    );
    return false;
  }
  const providedNumbers = playerNumbers && typeof playerNumbers === "object" ? playerNumbers : null;
  const providedLiberos = Array.isArray(liberos) ? liberos : null;
  const candidateCaptains = Array.isArray(captains) ? captains : matchState.state.captains || [];
  const normalizedCaptains = normalizePlayers(candidateCaptains).filter(name => normalized.includes(name));
  const chosenCaptain = normalizedCaptains[0] || "";
  const nextCaptains = chosenCaptain ? [chosenCaptain] : [];
  const nextNumbers = buildNumbersForNames(normalized, providedNumbers || matchState.state.playerNumbers || {});
  const nextLiberos = (providedLiberos || matchState.state.liberos || []).filter(name => normalized.includes(name));
  const preferred =
    typeof preferredLibero === "string" && preferredLibero && nextLiberos.includes(preferredLibero)
      ? preferredLibero
      : nextLiberos.includes(matchState.state.preferredLibero)
        ? matchState.state.preferredLibero
        : nextLiberos[0] || "";
  const lineupNames =
    Array.isArray(defaultLineupNames) && defaultLineupNames.length > 0
      ? normalizePlayers(defaultLineupNames).filter(name => normalized.includes(name))
      : normalized;

  if (!changed) {
    matchState.state.playerNumbers = nextNumbers;
    matchState.state.liberos = nextLiberos;
    matchState.state.captains = nextCaptains;
    setTeamPreferredLibero("our", preferred);
    if (setDefaultLineup) {
      applyDefaultLineup(lineupNames, defaultLineupRotation);
    }
    sanitizeRosterIsolation("our");
    saveState();
    renderPlayersManagerList();
  } else {
    if (!preserveFlowState) {
      resetSetTypeState();
    }
    matchState.state.players = normalized;
    matchState.state.playerNumbers = nextNumbers;
    if (!preserveCourt) {
      ensureCourtShape();
      matchState.state.court = Array.from({ length: 6 }, () => ({ main: "" }));
      matchState.state.rotation = 1;
    } else {
      ensureCourtShape();
      cleanCourtPlayers();
    }
    matchState.state.liberos = nextLiberos;
    matchState.state.captains = nextCaptains;
    setTeamPreferredLibero("our", preferred);
    if (setDefaultLineup) {
      applyDefaultLineup(lineupNames, defaultLineupRotation);
    }
    matchState.state.autoRoleBaseCourt = null;
    rosterLineupState.autoRoleBaseCourt = null;
    resetAutoRoleCache();
    ensureMetricsConfigDefaults();
    matchState.state.savedTeams = matchState.state.savedTeams || {};
    sanitizeRosterIsolation("our");
    saveState();
    renderPlayersManagerList();
  }

  renderPlayers();
  renderLiberoChipsInline();

  renderLiberoTags();
  renderMetricsConfig();
  renderTeamsSelect();
  updateRotationDisplay();
  renderEventsLog();
  renderAggregatedTable();
  return true;
}

export function handleBenchDragStart(e) {
  const target = e.currentTarget;
  if (!(target instanceof HTMLElement)) return;
  const name = target.dataset.playerName;
  if (!name || !e.dataTransfer) return;
  const scope = target.dataset.teamScope || "our";
  if (!isLiberoForScope(name, scope)) return;
  rosterLineupState.draggedPlayerName = name;
  rosterLineupState.draggedFromPos = null;
  rosterLineupState.dragSourceType = "bench";
  rosterLineupState.draggedScope = scope;
  e.dataTransfer.setData("text/plain", name);
  e.dataTransfer.effectAllowed = "move";
  if (rosterLineupState.activeDropChip) {
    rosterLineupState.activeDropChip.classList.remove("drop-over");
    rosterLineupState.activeDropChip = null;
  }
}

export function handleBenchDragEnd() {
  resetDragState();
}

export function moveBenchTouchGhost(x, y) {
  if (!rosterLineupState.touchBenchGhost) return;
  rosterLineupState.touchBenchGhost.style.left = x + "px";
  rosterLineupState.touchBenchGhost.style.top = y + "px";
}

export function handleBenchTouchMove(e) {
  if (!rosterLineupState.touchBenchName) return;
  const t = e.touches && e.touches[0];
  if (!t) return;
  moveBenchTouchGhost(t.clientX, t.clientY);
  updateBenchTouchOver(t.clientX, t.clientY);
  e.stopPropagation();
  e.preventDefault();
}

export function handleBenchTouchEnd(e) {
  if (!rosterLineupState.touchBenchName) return;
  const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
  const endX = t ? t.clientX : rosterLineupState.touchBenchStart.x;
  const endY = t ? t.clientY : rosterLineupState.touchBenchStart.y;
  const dist = Math.hypot(endX - rosterLineupState.touchBenchStart.x, endY - rosterLineupState.touchBenchStart.y);
  if (dist < 8) {
    handleBenchClickForScope(rosterLineupState.touchBenchName, rosterLineupState.touchBenchScope);
    clearBenchTouch();
    return;
  }
  if (rosterLineupState.touchBenchOverPos >= 0 && canPlaceInSlotForScope(rosterLineupState.touchBenchName, rosterLineupState.touchBenchOverPos, true, rosterLineupState.touchBenchScope)) {
    setCourtPlayerForScope(rosterLineupState.touchBenchOverPos, "main", rosterLineupState.touchBenchName, rosterLineupState.touchBenchScope);
  }
  e.stopPropagation();
  clearBenchTouch();
}

export function handleBenchTouchCancel() {
  clearBenchTouch();
}

export function handleBenchPointerMove(e) {
  if (rosterLineupState.touchBenchPointerId === null || e.pointerId !== rosterLineupState.touchBenchPointerId) return;
  if (!rosterLineupState.touchBenchName) return;
  moveBenchTouchGhost(e.clientX, e.clientY);
  updateBenchTouchOver(e.clientX, e.clientY);
  e.stopPropagation();
  e.preventDefault();
}

export function handleBenchPointerUp(e) {
  if (rosterLineupState.touchBenchPointerId === null || e.pointerId !== rosterLineupState.touchBenchPointerId) return;
  if (e.target && typeof e.target.releasePointerCapture === "function") {
    e.target.releasePointerCapture(e.pointerId);
  }
  handleBenchPointerDrop(e);
}

export function handleBenchPointerCancel(e) {
  if (rosterLineupState.touchBenchPointerId === null || e.pointerId !== rosterLineupState.touchBenchPointerId) return;
  if (e.target && typeof e.target.releasePointerCapture === "function") {
    e.target.releasePointerCapture(e.pointerId);
  }
  clearBenchTouch();
  rosterLineupState.touchBenchPointerId = null;
}

export function handleBenchPointerDrop(e) {
  if (!rosterLineupState.touchBenchName) {
    clearBenchTouch();
    rosterLineupState.touchBenchPointerId = null;
    return;
  }
  const dist = Math.hypot(e.clientX - rosterLineupState.touchBenchStart.x, e.clientY - rosterLineupState.touchBenchStart.y);
  if (dist < 8) {
    handleBenchClickForScope(rosterLineupState.touchBenchName, rosterLineupState.touchBenchScope);
  } else if (
    rosterLineupState.touchBenchOverPos >= 0 &&
    canPlaceInSlotForScope(rosterLineupState.touchBenchName, rosterLineupState.touchBenchOverPos, true, rosterLineupState.touchBenchScope)
  ) {
    setCourtPlayerForScope(rosterLineupState.touchBenchOverPos, "main", rosterLineupState.touchBenchName, rosterLineupState.touchBenchScope);
  }
  e.stopPropagation();
  e.preventDefault();
  clearBenchTouch();
  rosterLineupState.touchBenchPointerId = null;
}

export function handleCourtDragStart(e, posIdx, scope = "our") {
  const slot = getTeamCourt(scope)[posIdx] || { main: "" };
  if (!slot.main || !e.dataTransfer) return;
  rosterLineupState.draggedPlayerName = slot.main;
  rosterLineupState.draggedFromPos = posIdx;
  rosterLineupState.dragSourceType = "court";
  rosterLineupState.draggedScope = scope;
  e.dataTransfer.setData("text/plain", slot.main);
  e.dataTransfer.effectAllowed = "move";
  if (rosterLineupState.activeDropChip) {
    rosterLineupState.activeDropChip.classList.remove("drop-over");
    rosterLineupState.activeDropChip = null;
  }
}

export function handleCourtDragEnd() {
  resetDragState();
}

export function handlePositionDragOver(e, card) {
  const name =
    (e.dataTransfer && e.dataTransfer.getData("text/plain")) || rosterLineupState.draggedPlayerName;
  if (!name) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  if (rosterLineupState.activeDropChip && rosterLineupState.activeDropChip !== card) {
    rosterLineupState.activeDropChip.classList.remove("drop-over");
  }
  rosterLineupState.activeDropChip = card;
  card.classList.add("drop-over");
}

export function handlePositionDragLeave(card) {
  card.classList.remove("drop-over");
  if (rosterLineupState.activeDropChip === card) {
    rosterLineupState.activeDropChip = null;
  }
}

export function handlePositionDrop(e, card) {
  e.preventDefault();
  const name =
    (e.dataTransfer && e.dataTransfer.getData("text/plain")) ||
    rosterLineupState.draggedPlayerName;
  const posIdx = parseInt(card.dataset.posIndex, 10);
  const target = card.dataset.dropTarget || "main";
  const scope =
    card.dataset.teamScope || rosterLineupState.draggedScope || "our";
  card.classList.remove("drop-over");
  if (!name || isNaN(posIdx)) {
    resetDragState();
    return;
  }
  if (
    rosterLineupState.draggedPlayerName &&
    rosterLineupState.draggedScope !== scope
  ) {
    resetDragState();
    return;
  }
  const court =
    scope === "opponent"
      ? matchState.state.opponentCourt || []
      : matchState.state.court || [];
  const targetSlot = court[posIdx] || { main: "", replaced: "" };
  if (
    isLiberoForScope(targetSlot.main, scope) &&
    targetSlot.replaced === name
  ) {
    setCourtPlayerForScope(posIdx, target, name, scope);
    resetDragState();
    return;
  }
  if (
    rosterLineupState.dragSourceType === "court" &&
    rosterLineupState.draggedFromPos !== null
  ) {
    if (!isLiberoForScope(name, scope)) {
      resetDragState();
      return;
    }
    if (rosterLineupState.draggedFromPos === posIdx) {
      resetDragState();
      return;
    }
    if (!canPlaceInSlotForScope(name, posIdx, true, scope)) {
      resetDragState();
      return;
    }
    const baseCourt = ensureCourtShapeFor(court);
    const originSlot = baseCourt[rosterLineupState.draggedFromPos] || {
      main: "",
      replaced: "",
    };
    if (originSlot.main === name) {
      baseCourt[rosterLineupState.draggedFromPos] = originSlot.replaced
        ? { main: originSlot.replaced, replaced: "" }
        : { main: "", replaced: "" };
    }
    let nextCourt = null;

    nextCourt = rosterLineupState.lineupCore.setPlayerOnCourt({
      court: baseCourt,
      posIdx,
      playerName: name,
      liberos: getTeamLiberos(scope),
    });

    commitCourtChangeForScope(nextCourt, scope);
    resetDragState();
    return;
  }
  if (!isLiberoForScope(name, scope)) {
    resetDragState();
    return;
  }
  setCourtPlayerForScope(posIdx, target, name, scope);
  resetDragState();
}

export function handleBenchClickForScope(name, scope = "our") {
  if (!isLiberoForScope(name, scope)) return;
  const court = ensureCourtShapeFor(getTeamCourt(scope));
  const lockedMap = getLockedMapForScope(scope);
  const targetPos =
    lockedMap[name] !== undefined
      ? lockedMap[name]
      : court.findIndex(slot => !slot.main);
  if (targetPos === -1 || targetPos === undefined) {
    alert("Trascina la riserva sulla posizione da sostituire.");
    return;
  }
  setCourtPlayerForScope(targetPos, "main", name, scope);
}











export function renderLiberoChipsInline() {
  renderLiberoBench();
}

export function renderOpponentLiberoChipsInline() {
  renderLiberoBench();
}





export function updateRotationDisplay() {
  const rotationLabel = rot => "P" + String(parseInt(rot, 10) || 1);
  if (matchState.elRotationIndicator) {
    matchState.elRotationIndicator.textContent = rotationLabel(matchState.state.rotation || 1);
  }

  syncAutoRotateToggle();
  syncAutoRoleToggle();
  syncAutoRoleP1AmericanToggle();
  syncPredictiveSkillToggle();
  if (typeof syncAttackTrajectoryToggle === "function") {
    syncAttackTrajectoryToggle();
  }
}

export function getRoleLabel(index) {
  return getRoleLabelForRotation(index, matchState.state.rotation || 1);
}



export function syncAutoRotateToggle() {

}

export function setAutoRotateEnabled(enabled) {
  matchState.state.autoRotate = !!enabled;
  if (!matchState.state.autoRotate) {
    matchState.state.autoRotatePending = false;
  }
  saveState();
  syncAutoRotateToggle();
}

export function syncAutoRoleToggle() {

}

export function syncPredictiveSkillToggle() {

}

export function syncAttackTrajectoryToggle() {

}

export function syncSkillFlowButtons() {
  const containers = [rosterLineupState.elSkillFlowButtons, rosterLineupState.elSkillFlowButtonsOpp].filter(Boolean);
  if (containers.length === 0) return;
  ;
  ensureMetricsConfigDefaults();
  containers.forEach(container => {
    Array.from(container.querySelectorAll("[data-force-skill]")).forEach(btn => {
      const skillId = btn.dataset.forceSkill;

return;
});
  });
}

export function syncAutoRoleP1AmericanToggle() {

}

export function setCurrentSet(value, options = {}) {
  const setNum = Math.min(5, Math.max(1, parseInt(value, 10) || 1));
  matchState.state.currentSet = setNum;

  if (options.save !== false) {
    saveState();
  }
  renderLiveScore();
}

export function setRotation(value) {
  const rot = Math.min(6, Math.max(1, parseInt(value, 10) || 1));
  matchState.state.rotation = rot;
  saveState();
  updateRotationDisplay();
  renderPlayers();

  if (matchState.state.autoRolePositioning && typeof applyAutoRolePositioning === "function") {
    applyAutoRolePositioning();
  }
}

export function updateOpponentRotationDisplay() {
  if (typeof matchState.elRotationSelectOpp !== "undefined" && matchState.elRotationSelectOpp) {
    matchState.elRotationSelectOpp.value = String(matchState.state.opponentRotation || 1);
  }
}

export function setOpponentRotation(value) {
  const rot = Math.min(6, Math.max(1, parseInt(value, 10) || 1));
  matchState.state.opponentRotation = rot;
  saveState();
  updateOpponentRotationDisplay();
  renderOpponentPlayers({ animate: true });
}

export function rotateOpponentCourt(direction = "cw") {
  rotateCourtState(direction, "opponent");
  saveState();
  updateOpponentRotationDisplay();
  renderOpponentPlayers({ animate: true });
}

export function captureRects(selector, keyBuilder) {
  const map = new Map();
  document.querySelectorAll(selector).forEach(node => {
    if (!(node instanceof HTMLElement)) return;
    const key = keyBuilder(node);
    if (!key) return;
    map.set(key, node.getBoundingClientRect());
  });
  return map;
}

export function animateFlip(prevRects, selector, keyBuilder) {
  if (!prevRects || prevRects.size === 0) return;
  const nodes = document.querySelectorAll(selector);
  nodes.forEach(node => {
    if (!(node instanceof HTMLElement)) return;
    const key = keyBuilder(node);
    if (!key || !prevRects.has(key)) return;
    const prev = prevRects.get(key);
    const next = node.getBoundingClientRect();
    const dx = prev.left - next.left;
    const dy = prev.top - next.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    node.style.transition = "none";
    node.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(() => {
      node.style.transition = "transform 360ms ease, opacity 360ms ease";
      node.style.transform = "translate(0px, 0px)";
    });
  });
}

export function applyAutoRolePositioning() {
 if (!prepareAutoRolePositioning()) return;
 saveState();
 renderPlayers();
 renderLiberoChipsInline();

 updateRotationDisplay();
}

export function rotateCourt(direction) {
  const prevCourtRects = captureRects(".court-card", el => {
    const name = el.dataset.playerName || "";
    const pos = el.dataset.posIndex || "";
    return name || "pos-" + pos;
  });
  const prevMiniRects = captureRects(".mini-slot", el => {
    const name = el.dataset.playerName || "";
    const pos = el.dataset.slotIndex || "";
    return name || "mini-" + pos;
  });
  if (rotateCourtState(direction)) applyAutoRolePositioning();
  saveState();
  renderPlayers();

  updateRotationDisplay();
  animateFlip(prevCourtRects, ".court-card", el => {
    const name = el.dataset.playerName || "";
    const pos = el.dataset.posIndex || "";
    return name || "pos-" + pos;
  });
  animateFlip(prevMiniRects, ".mini-slot", el => {
    const name = el.dataset.playerName || "";
    const pos = el.dataset.slotIndex || "";
    return name || "mini-" + pos;
  });
}

export function openSettingsModal() {
  if (!rosterLineupState.elSettingsModal) return;
  setReactSettingsOpen(true);
  document.body.style.overflow = "hidden";
  setGlobalModalState(true, { forcePopup: true });
}

export function closeSettingsModal() {
  if (!rosterLineupState.elSettingsModal) return;
  setReactSettingsOpen(false);
  document.body.style.overflow = "";
  setGlobalModalState(false, { forcePopup: true });
}

export function resetDragState() {
  rosterLineupState.draggedPlayerName = "";
  rosterLineupState.draggedFromPos = null;
  rosterLineupState.dragSourceType = "";
  rosterLineupState.draggedScope = "our";
  if (rosterLineupState.activeDropChip) {
    rosterLineupState.activeDropChip.classList.remove("drop-over");
    rosterLineupState.activeDropChip = null;
  }
}

export function ensureBenchTouchListeners() {
  if (rosterLineupState.benchTouchListenersAttached) return;
  listenRuntime(document, "touchmove", handleBenchTouchMove, { passive: false });
  listenRuntime(document, "touchend", handleBenchTouchEnd, { passive: false });
  listenRuntime(document, "touchcancel", handleBenchTouchCancel, { passive: false });
  listenRuntime(document, "pointermove", handleBenchPointerMove, { passive: false });
  listenRuntime(document, "pointerup", handleBenchPointerUp, { passive: false });
  listenRuntime(document, "pointercancel", handleBenchPointerCancel, { passive: false });
  rosterLineupState.benchTouchListenersAttached = true;
}

export function createBenchTouchGhost(text, x, y) {
  if (rosterLineupState.touchBenchGhost && rosterLineupState.touchBenchGhost.parentNode) {
    rosterLineupState.touchBenchGhost.parentNode.removeChild(rosterLineupState.touchBenchGhost);
  }
  const ghost = document.createElement("div");
  ghost.className = "touch-drag-ghost";
  ghost.textContent = text;
  ghost.style.left = x + "px";
  ghost.style.top = y + "px";
  document.body.appendChild(ghost);
  rosterLineupState.touchBenchGhost = ghost;
}

export function clearBenchTouch() {
  const prev = document.querySelector(".court-card.drop-over");
  if (prev) prev.classList.remove("drop-over");
  if (rosterLineupState.touchBenchGhost && rosterLineupState.touchBenchGhost.parentNode) {
    rosterLineupState.touchBenchGhost.parentNode.removeChild(rosterLineupState.touchBenchGhost);
  }
  rosterLineupState.touchBenchGhost = null;
  rosterLineupState.touchBenchName = "";
  rosterLineupState.touchBenchOverPos = -1;
  rosterLineupState.touchBenchPointerId = null;
  document.body.style.overflow = "";
}

export function updateBenchTouchOver(x, y) {
  const elAt = document.elementFromPoint(x, y);
  const card = elAt && elAt.closest(".court-card");
  const prev = document.querySelector(".court-card.drop-over");
  if (prev) prev.classList.remove("drop-over");
  if (!card || !card.dataset.posIndex || (card.dataset.teamScope || "our") !== rosterLineupState.touchBenchScope) {
    rosterLineupState.touchBenchOverPos = -1;
    return;
  }
  const posIdx = parseInt(card.dataset.posIndex, 10);
  if (isNaN(posIdx) || !canPlaceInSlotForScope(rosterLineupState.touchBenchName, posIdx, false, rosterLineupState.touchBenchScope)) {
    rosterLineupState.touchBenchOverPos = -1;
    return;
  }
  rosterLineupState.touchBenchOverPos = posIdx;
  card.classList.add("drop-over");
}

export function handleBenchTouchStart(e, name, scope = "our") {
  const t = e.touches && e.touches[0];
  if (!t) return;
  ensureBenchTouchListeners();
  rosterLineupState.touchBenchName = name;
  rosterLineupState.touchBenchScope = scope || "our";
  rosterLineupState.touchBenchStart = { x: t.clientX, y: t.clientY };
  const label =
    rosterLineupState.touchBenchScope === "opponent"
      ? formatNameWithNumberFor(name, matchState.state.opponentPlayerNumbers || {})
      : formatNameWithNumber(name);
  createBenchTouchGhost(label, t.clientX, t.clientY);
  updateBenchTouchOver(t.clientX, t.clientY);
  document.body.style.overflow = "hidden";
  e.stopPropagation();
  e.preventDefault();
}

export function handleBenchPointerDown(e, name, scope = "our") {
  if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
  ensureBenchTouchListeners();
  rosterLineupState.touchBenchPointerId = e.pointerId;
  rosterLineupState.touchBenchName = name;
  rosterLineupState.touchBenchScope = scope || "our";
  rosterLineupState.touchBenchStart = { x: e.clientX, y: e.clientY };
  const label =
    rosterLineupState.touchBenchScope === "opponent"
      ? formatNameWithNumberFor(name, matchState.state.opponentPlayerNumbers || {})
      : formatNameWithNumber(name);
  createBenchTouchGhost(label, e.clientX, e.clientY);
  updateBenchTouchOver(e.clientX, e.clientY);
  document.body.style.overflow = "hidden";
  if (e.target && typeof e.target.setPointerCapture === "function") {
    e.target.setPointerCapture(e.pointerId);
  }
  e.stopPropagation();
  e.preventDefault();
}
