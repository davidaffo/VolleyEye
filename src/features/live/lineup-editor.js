import { captureScoutActionSnapshot, attachScoutActionSnapshot } from "../events/history-model.js";
import { getLineupModalLiberos, formatLineupModalName, getLineupModalPlayers, getLineupModalNumbers } from "../teams/lineup-selectors.js";
import { publishLineupView, setLineupOpen } from "./lineup-view.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { isDesktopCourtModalLayout, setCourtAreaLocked, setModalOpenState } from "../layout/modals.js";
import { updateCourtModalPlacement } from "../scout-ui.js";
import { session as matchState } from "../../../js/globals.js";
import { getCourtShape, cloneCourt } from "../teams/court-model.js";
import { getNextSetEntry, swapNextSetSlots, setNextSetPlayer, clearNextSetSlot } from "./next-set-model.js";
import { renderNextSetLineups } from "./next-set-view.js";
import { lineup } from "../../domain/lineup.js";
import { listenRuntime } from "../../app/browser-effects.js";
import { publishSetStartView, setSetStartOpen } from "./set-start-view.js";
import { makePlayerNameKey, ensureSetStartSnapshot } from "../analysis/player-model.js";
import { saveState } from "../storage/save-state.js";
import { renderAggregatedTable } from "../analysis/aggregated-table.js";
import { commitCourtChangeForScope, commitCourtChange } from "../teams/court/court-engine.js";
import { renderOpponentPlayers, renderPlayers } from "./team-rendering.js";
import { setOpponentRotation, setRotation } from "../teams/court/court-ui-bootstrap.js";
import { updateOpponentRotationDisplay, updateRotationDisplay } from "../teams/court-view.js";
import { recordSubstitutionEvent } from "../video/video-events.js";
import { ensureSetStartDraft } from "./set-start-draft.js";
import { setTeamPreferredLibero, setTeamLiberoAutoMap } from "../teams/roster-data.js";
import { enforceAutoLiberoForScope } from "../teams/court-state-model.js";
import { loadTeamFromStorage, extractRosterFromTeam } from "../teams/storage/team-repository.js";
import { renderLiberoBench } from "../scout/court-commands.js";

export function getLineupBaseCourtFromState() {
  const libSet = new Set(getLineupModalLiberos());
  const baseCourt =
    scoutUiState.lineupModalScope === "opponent" ? matchState.state.opponentCourt || [] : matchState.state.court;
  return getCourtShape(baseCourt).map(slot => {
    if (libSet.has(slot.main)) {
      return { main: slot.replaced || "", replaced: "" };
    }
    return { main: slot.main || "", replaced: "" };
  });
}

export function getLineupSubstitutions(prevCourt, nextCourt, scope = "our") {
  const libSet = new Set(scope === "opponent" ? matchState.state.opponentLiberos || [] : matchState.state.liberos || []);
  const subs = [];
  for (let i = 0; i < 6; i += 1) {
    const prevName = (prevCourt[i] && prevCourt[i].main) || "";
    const nextName = (nextCourt[i] && nextCourt[i].main) || "";
    if (!prevName || !nextName || prevName === nextName) continue;
    if (libSet.has(prevName) || libSet.has(nextName)) continue;
    subs.push({ playerIn: nextName, playerOut: prevName });
  }
  return subs;
}

export function assignPlayerToLineup(name, posIdx) {
  const core = lineup;
  if (core && typeof core.setPlayerOnCourt === "function") {
    scoutUiState.lineupModalCourt = core.setPlayerOnCourt({
      court: scoutUiState.lineupModalCourt,
      posIdx,
      playerName: name,
      liberos: getLineupModalLiberos()
    });
  } else {
    scoutUiState.lineupModalCourt = getCourtShape(scoutUiState.lineupModalCourt).map((slot, idx) => {
      const updated = Object.assign({}, slot);
      if (updated.main === name) updated.main = "";
      if (updated.replaced === name) updated.replaced = "";
      if (idx === posIdx) updated.main = name;
      return updated;
    });
  }
}

export function swapLineupSlots(fromIdx, toIdx) {
  const core = lineup;
  if (core && typeof core.swapCourtSlots === "function") {
    scoutUiState.lineupModalCourt = core.swapCourtSlots({
      court: scoutUiState.lineupModalCourt,
      fromIdx,
      toIdx
    });
    return;
  }
  const court = getCourtShape(scoutUiState.lineupModalCourt);
  const next = court.map(slot => Object.assign({}, slot));
  const tmp = next[fromIdx];
  next[fromIdx] = next[toIdx];
  next[toIdx] = tmp;
  scoutUiState.lineupModalCourt = next;
}

export function clearLineupSlot(posIdx) {
  const core = lineup;
  if (core && typeof core.clearCourtSlot === "function") {
    scoutUiState.lineupModalCourt = core.clearCourtSlot({
      court: scoutUiState.lineupModalCourt,
      posIdx,
      liberos: getLineupModalLiberos()
    });
  } else {
    scoutUiState.lineupModalCourt = getCourtShape(scoutUiState.lineupModalCourt).map((slot, idx) =>
      idx === posIdx ? { main: "", replaced: "" } : slot
    );
  }
}

export function ensureLineupTouchListeners() {
  if (scoutUiState.lineupTouchListenersAttached) return;
  listenRuntime(document, "touchmove", handleLineupTouchMove, { passive: false });
  listenRuntime(document, "touchend", handleLineupTouchEnd, { passive: false });
  listenRuntime(document, "touchcancel", handleLineupTouchCancel, { passive: false });
  scoutUiState.lineupTouchListenersAttached = true;
}

export function clearLineupTouch() {
  const prev = document.querySelector(".lineup-slot.drop-over");
  if (prev) prev.classList.remove("drop-over");
  if (scoutUiState.lineupTouchGhost && scoutUiState.lineupTouchGhost.parentNode) {
    scoutUiState.lineupTouchGhost.parentNode.removeChild(scoutUiState.lineupTouchGhost);
  }
  scoutUiState.lineupTouchGhost = null;
  scoutUiState.lineupTouchActive = false;
  scoutUiState.lineupTouchName = "";
  scoutUiState.lineupTouchFromIdx = null;
  scoutUiState.lineupTouchOverIdx = null;
  scoutUiState.lineupTouchContext = "";
  scoutUiState.lineupTouchScope = "our";
  document.body.style.overflow = "";
}

export function updateLineupTouchOver(x, y) {
  const elAt = document.elementFromPoint(x, y);
  const card = elAt && elAt.closest(".lineup-slot");
  const prev = document.querySelector(".lineup-slot.drop-over");
  if (prev) prev.classList.remove("drop-over");
  if (!card || (card.dataset.teamScope || "our") !== scoutUiState.lineupTouchScope) {
    scoutUiState.lineupTouchOverIdx = null;
    return;
  }
  if (scoutUiState.lineupTouchContext === "modal") {
    if (!card.closest("#lineup-modal")) {
      scoutUiState.lineupTouchOverIdx = null;
      return;
    }
  } else if (scoutUiState.lineupTouchContext === "next-set") {
    if (!card.closest("#next-set-lineups")) {
      scoutUiState.lineupTouchOverIdx = null;
      return;
    }
  } else {
    scoutUiState.lineupTouchOverIdx = null;
    return;
  }
  const posIdx = parseInt(card.dataset.posIndex, 10);
  if (isNaN(posIdx)) {
    scoutUiState.lineupTouchOverIdx = null;
    return;
  }
  scoutUiState.lineupTouchOverIdx = posIdx;
  card.classList.add("drop-over");
}

export function createLineupTouchGhost(text, x, y) {
  if (scoutUiState.lineupTouchGhost && scoutUiState.lineupTouchGhost.parentNode) {
    scoutUiState.lineupTouchGhost.parentNode.removeChild(scoutUiState.lineupTouchGhost);
  }
  const ghost = document.createElement("div");
  ghost.className = "touch-drag-ghost";
  ghost.textContent = text;
  ghost.style.left = x + "px";
  ghost.style.top = y + "px";
  document.body.appendChild(ghost);
  scoutUiState.lineupTouchGhost = ghost;
}

export function moveLineupTouchGhost(x, y) {
  if (!scoutUiState.lineupTouchGhost) return;
  scoutUiState.lineupTouchGhost.style.left = x + "px";
  scoutUiState.lineupTouchGhost.style.top = y + "px";
}

export function handleLineupTouchStart(e, name, fromIdx, context, scope) {
  const t = e.touches && e.touches[0];
  if (!t || !name) return;
  ensureLineupTouchListeners();
  scoutUiState.lineupTouchActive = true;
  scoutUiState.lineupTouchName = name;
  scoutUiState.lineupTouchFromIdx = typeof fromIdx === "number" ? fromIdx : null;
  scoutUiState.lineupTouchContext = context || "";
  scoutUiState.lineupTouchScope = scope || "our";
  scoutUiState.lineupTouchStart = { x: t.clientX, y: t.clientY };
  const label = formatLineupModalName(name, { compactCourt: true, scope: scoutUiState.lineupTouchScope });
  createLineupTouchGhost(label, t.clientX, t.clientY);
  updateLineupTouchOver(t.clientX, t.clientY);
  document.body.style.overflow = "hidden";
  e.stopPropagation();
  e.preventDefault();
}

export function handleLineupTouchMove(e) {
  if (!scoutUiState.lineupTouchActive) return;
  const t = e.touches && e.touches[0];
  if (!t) return;
  moveLineupTouchGhost(t.clientX, t.clientY);
  updateLineupTouchOver(t.clientX, t.clientY);
  e.stopPropagation();
  e.preventDefault();
}

export function finalizeLineupTouch(e, forcedIdx = null) {
  if (!scoutUiState.lineupTouchActive) return;
  if (typeof forcedIdx === "number") {
    scoutUiState.lineupTouchOverIdx = forcedIdx;
  }
  const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
  const endX = t ? t.clientX : scoutUiState.lineupTouchStart.x;
  const endY = t ? t.clientY : scoutUiState.lineupTouchStart.y;
  const dist = Math.hypot(endX - scoutUiState.lineupTouchStart.x, endY - scoutUiState.lineupTouchStart.y);
  if (scoutUiState.lineupTouchContext === "modal") {
    if (scoutUiState.lineupTouchFromIdx === null && scoutUiState.lineupTouchName) {
      const idx = getCourtShape(scoutUiState.lineupModalCourt).findIndex(slot => slot.main === scoutUiState.lineupTouchName);
      if (idx >= 0) scoutUiState.lineupTouchFromIdx = idx;
    }
    if (typeof scoutUiState.lineupTouchOverIdx === "number" && scoutUiState.lineupTouchOverIdx >= 0) {
      if (typeof scoutUiState.lineupTouchFromIdx === "number" && scoutUiState.lineupTouchFromIdx !== scoutUiState.lineupTouchOverIdx) {
        swapLineupSlots(scoutUiState.lineupTouchFromIdx, scoutUiState.lineupTouchOverIdx);
      } else {
        assignPlayerToLineup(scoutUiState.lineupTouchName, scoutUiState.lineupTouchOverIdx);
      }
      scoutUiState.lineupSelectedName = "";
      renderLineupModal();
    } else if (dist < 8) {
      if (typeof scoutUiState.lineupTouchFromIdx === "number") {
        clearLineupSlot(scoutUiState.lineupTouchFromIdx);
        renderLineupModal();
      } else {
        scoutUiState.lineupSelectedName = scoutUiState.lineupTouchName;
        renderLineupModal();
      }
    }
  } else if (scoutUiState.lineupTouchContext === "next-set") {
    if (scoutUiState.lineupTouchFromIdx === null && scoutUiState.lineupTouchName) {
      const entry = getNextSetEntry(scoutUiState.lineupTouchScope);
      const court = entry ? getCourtShape(entry.court || []) : [];
      const idx = court.findIndex(slot => slot.main === scoutUiState.lineupTouchName);
      if (idx >= 0) scoutUiState.lineupTouchFromIdx = idx;
    }
    if (typeof scoutUiState.lineupTouchOverIdx === "number" && scoutUiState.lineupTouchOverIdx >= 0) {
      if (typeof scoutUiState.lineupTouchFromIdx === "number" && scoutUiState.lineupTouchFromIdx !== scoutUiState.lineupTouchOverIdx) {
        swapNextSetSlots(scoutUiState.lineupTouchScope, scoutUiState.lineupTouchFromIdx, scoutUiState.lineupTouchOverIdx);
      } else {
        setNextSetPlayer(scoutUiState.lineupTouchScope, scoutUiState.lineupTouchOverIdx, scoutUiState.lineupTouchName);
      }
      renderNextSetLineups();
    } else if (dist < 8) {
      if (typeof scoutUiState.lineupTouchFromIdx === "number") {
        clearNextSetSlot(scoutUiState.lineupTouchScope, scoutUiState.lineupTouchFromIdx);
        renderNextSetLineups();
      } else {
        const entry = getNextSetEntry(scoutUiState.lineupTouchScope);
        const court = entry ? getCourtShape(entry.court || []) : [];
        const nextEmpty = court.findIndex(slot => !slot.main);
        const targetIdx = nextEmpty !== -1 ? nextEmpty : 0;
        setNextSetPlayer(scoutUiState.lineupTouchScope, targetIdx, scoutUiState.lineupTouchName);
        renderNextSetLineups();
      }
    }
  }
  clearLineupTouch();
  e.stopPropagation();
  e.preventDefault();
}

export function handleLineupTouchEnd(e) {
  if (!scoutUiState.lineupTouchActive) return;
  const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
  if (t) updateLineupTouchOver(t.clientX, t.clientY);
  finalizeLineupTouch(e);
}

export function handleLineupTouchCancel() {
  if (!scoutUiState.lineupTouchActive) return;
  clearLineupTouch();
}

export function renderLineupModal() {
  if (!scoutUiState.elLineupModalCourt || !scoutUiState.elLineupModalBench) return;

 publishLineupView(); return;
}

export function openMobileLineupModal(scope = "our") {
  scoutUiState.lineupModalContext = "match";
  scoutUiState.lineupModalScope = scope === "opponent" ? "opponent" : "our";
  scoutUiState.lineupModalDefaultRotation = null;
  const libSet = new Set(getLineupModalLiberos());
  const baseCourt =
    scoutUiState.lineupModalScope === "opponent" ? matchState.state.opponentCourt || [] : matchState.state.court;
  const normalizedCourt = getCourtShape(baseCourt).map(slot => {
    if (libSet.has(slot.main)) {
      return { main: slot.replaced || "", replaced: "" };
    }
    return { main: slot.main || "", replaced: "" };
  });
  scoutUiState.lineupModalCourt = cloneCourt(normalizedCourt);
  renderLineupModal();
  publishLineupView();
  if (scoutUiState.elLineupModal) {
    if (isDesktopCourtModalLayout()) {
      setCourtAreaLocked(true);
    }
    updateCourtModalPlacement();
    setLineupOpen(true);
    setModalOpenState(true);
  }
}

export function renderSetStartModal() {
  if (!scoutUiState.elSetStartModalBody) return;

 publishSetStartView(); return;
}





export function updateSetStartSelection(setNum, scope, playerName, value) {
  const draft = ensureSetStartDraft(setNum, scope);
  const key = makePlayerNameKey(playerName);
  const nextValue = value || "";
  const entry = draft.selections.get(key) || { name: playerName, value: "" };
  entry.value = nextValue;
  draft.selections.set(key, entry);
  if (nextValue && nextValue !== "in") {
    draft.selections.forEach((other, otherKey) => {
      if (otherKey === key) return;
      if (other.value === nextValue) {
        other.value = "";
      }
    });
  }
}

export function applySetStartDraft() {
  if (!scoutUiState.setStartDraft) return;
  const setNum = scoutUiState.setStartDraft.setNum;
  const scope = scoutUiState.setStartDraft.scope;
  ensureSetStartSnapshot(setNum);
  const entry = matchState.state.setStarts && matchState.state.setStarts[setNum];
  if (!entry) return;
  const scopeEntry = scope === "opponent" ? entry.opponent : entry.our;
  if (!scopeEntry) return;
  const nextCourt = Array.from({ length: 6 }, () => ({ main: "", replaced: "" }));
  const subsIn = [];
  scoutUiState.setStartDraft.selections.forEach(item => {
    const raw = item && item.value ? String(item.value) : "";
    if (!raw) return;
    if (raw === "in") {
      subsIn.push(makePlayerNameKey(item.name));
      return;
    }
    const pos = parseInt(raw, 10);
    if (!pos || pos < 1 || pos > 6) return;
    nextCourt[pos - 1] = { main: item.name, replaced: "" };
  });
  scopeEntry.court = nextCourt;
  scopeEntry.subsIn = subsIn;
  saveState({ persistLocal: true });
  renderAggregatedTable();
  closeSetStartModal();
}

export function openSetStartEditor(setNum, scope = "our") {
  const targetSet = parseInt(setNum, 10) || matchState.state.currentSet || 1;
  scoutUiState.setStartModalSetNum = targetSet;
  scoutUiState.setStartModalScope = scope === "opponent" ? "opponent" : "our";
  ensureSetStartDraft(targetSet, scoutUiState.setStartModalScope);
  renderSetStartModal();
  if (scoutUiState.elSetStartModal) {
    setSetStartOpen(true);
    setModalOpenState(true, true);
  }
}

export function closeLineupModal() {
  if (scoutUiState.elLineupModal) {
    setLineupOpen(false);
    scoutUiState.elLineupModal.classList.remove("force-popup");
    setModalOpenState(false);
  }
  scoutUiState.lineupDragName = "";
  scoutUiState.lineupSelectedName = "";
  scoutUiState.lineupNumberMode = false;
  scoutUiState.lineupModalContext = "match";
  scoutUiState.setStartEditSetNum = null;
}

export function closeSetStartModal() {
  if (scoutUiState.elSetStartModal) {
    setSetStartOpen(false);
  }
  scoutUiState.setStartModalSetNum = null;
  scoutUiState.setStartModalScope = "our";
  scoutUiState.setStartDraft = null;
  setModalOpenState(false, true);
}

export function saveLineupModal({ countSubstitutions = false } = {}) {
  const actionSnapshot = countSubstitutions ? captureScoutActionSnapshot() : null;
  const prevCourt = countSubstitutions ? getLineupBaseCourtFromState() : null;
  const nextCourt = getCourtShape(scoutUiState.lineupModalCourt);
  const applyDefaultRotation = scoutUiState.lineupModalDefaultRotation;
  if (scoutUiState.lineupModalContext === "next-set" && scoutUiState.nextSetDraft) {
    const draftEntry = scoutUiState.lineupModalScope === "opponent" ? scoutUiState.nextSetDraft.opponent : scoutUiState.nextSetDraft.our;
    const nextRotation =
      typeof applyDefaultRotation === "number"
        ? applyDefaultRotation
        : (draftEntry && typeof draftEntry.rotation === "number" ? draftEntry.rotation : null);
    if (scoutUiState.lineupModalScope === "opponent") {
      scoutUiState.nextSetDraft.opponent = { court: cloneCourt(nextCourt), rotation: nextRotation };
    } else {
      scoutUiState.nextSetDraft.our = { court: cloneCourt(nextCourt), rotation: nextRotation };
    }
    scoutUiState.lineupModalDefaultRotation = null;
    closeLineupModal();
    return;
  }
  if (scoutUiState.lineupModalContext === "set-start") {
    scoutUiState.lineupModalDefaultRotation = null;
    closeLineupModal();
    return;
  }
  if (scoutUiState.lineupModalScope === "opponent") {
    commitCourtChangeForScope(nextCourt, "opponent");
    if (applyDefaultRotation) {
      setOpponentRotation(applyDefaultRotation);
    } else if (applyDefaultRotation) {
      matchState.state.opponentRotation = Math.min(6, Math.max(1, parseInt(applyDefaultRotation, 10) || 1));
      updateOpponentRotationDisplay();
      renderOpponentPlayers();
      saveState();
    }
  } else {
    commitCourtChange(nextCourt, { clean: true });
  }
  if (scoutUiState.lineupModalScope !== "opponent" && applyDefaultRotation) {
    setRotation(applyDefaultRotation);
  }
  if (countSubstitutions) {
    const scope = scoutUiState.lineupModalScope === "opponent" ? "opponent" : "our";
    const subs = getLineupSubstitutions(prevCourt || [], nextCourt, scope);
    subs.forEach(sub => recordSubstitutionEvent(Object.assign({}, sub, { teamScope: scope })));
    if (subs.length) {
      attachScoutActionSnapshot(matchState.state.events[matchState.state.events.length - 1], actionSnapshot);
      saveState({ persistLocal: true });
    }
  }
  scoutUiState.lineupModalDefaultRotation = null;
  closeLineupModal();
}

export function setLineupModalPreferredLibero(name) {
  const next = name || "";
  setTeamPreferredLibero(scoutUiState.lineupModalScope, next);
  setTeamLiberoAutoMap(scoutUiState.lineupModalScope, {});
  enforceAutoLiberoForScope(scoutUiState.lineupModalScope, { skipServerOnServe: true });
}

export function applyDefaultLineupToModal() {
  const teamName = scoutUiState.lineupModalScope === "opponent" ? matchState.state.selectedOpponentTeam || "" : matchState.state.selectedTeam || "";
  if (!teamName) {
    alert("Seleziona prima una squadra.");
    return;
  }
  ;
  const team = loadTeamFromStorage(teamName);
  if (!team) {
    alert("Squadra non trovata o corrotta.");
    return;
  }
  const roster = extractRosterFromTeam(team);
  const fallback = roster.playersDetailed && roster.playersDetailed.length > 0
    ? roster.playersDetailed.filter(p => !p.out && p.role !== "L").map(p => p.name)
    : roster.players || [];
  const names =
    roster.defaultLineup && roster.defaultLineup.length > 0 ? roster.defaultLineup : fallback;
  scoutUiState.lineupModalCourt = Array.from({ length: 6 }, (_, idx) => ({ main: names[idx] || "", replaced: "" }));
  scoutUiState.lineupModalDefaultRotation = roster.defaultRotation || 1;
  renderLineupModal();
}

export function applyNumberToLineupSlot(slotIdx, rawValue) {
  const value = (rawValue || "").trim();
  if (!value) return false;
  const players = getLineupModalPlayers();
  const numbers = getLineupModalNumbers();
  const matchName = players.find(name => numbers[name] === value);
  if (!matchName) return false;
  assignPlayerToLineup(matchName, slotIdx);
  return true;
}

export function exitLineupNumberMode() {
  scoutUiState.lineupNumberMode = false;
  renderLineupModal();
}

export function changeLineupPreferredLibero(next) {
      next = next || "";
      setLineupModalPreferredLibero(next);
      saveState();
      if (scoutUiState.lineupModalScope === "opponent") {
        renderOpponentPlayers();
        renderLiberoBench();
        updateOpponentRotationDisplay();
      } else {
        renderPlayers();

        renderLiberoBench();
        updateRotationDisplay();
      }
      renderLiberoBench();
      renderLiberoBench();
  publishLineupView();
}
