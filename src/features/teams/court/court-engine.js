import { isLiberoForScope, removeLiberosAndRestoreForScope } from "../libero-model.js";
import { ensureCourtShapeFor, cloneCourtLineup } from "../court-model.js";
import { AUTO_LIBERO_ROLE_DEFAULT_VERSION, SKILLS } from "../../../../js/globals.js";
import { session as matchState } from "../../../../js/globals.js";
import { saveState } from "../../storage/save-state.js";
import { renderPlayers, renderOpponentPlayers } from "../../live/team-rendering.js";
import { renderLiberoChipsInline, renderLineupChips, updateRotationDisplay, applyAutoRolePositioning, syncAutoRoleP1AmericanToggle, cleanLiberos, cleanLiberoAutoMapForScope, renderOpponentLiberoChipsInline, updateOpponentRotationDisplay } from "./court-ui-bootstrap.js";
import { getRoleLabelForRotation } from "../roles.js";
import { getTeamAutoLiberoRole } from "../auto-libero-selectors.js";
import { setTeamAutoLiberoRole, setTeamAutoLiberoBackline, setTeamLiberoAutoMap, getTeamLiberoAutoMap, getTeamPreferredLibero, setTeamPreferredLibero, getTeamPlayers, getTeamLiberos, getTeamCourt, getTeamAutoLiberoBackline, getTeamRotation, buildNumbersForNames, syncOpponentPlayerNumbers } from "../roster-data.js";
import { setTeamCourt, replaceOpponentPlayerNameEverywhere } from "../core/player-model.js";
import { normalizePlayers } from "../../../domain/player-names.js";
import { session as rosterLineupState } from "../../state/roster-lineup.js";
import { getPointDirection } from "../../analysis/scores.js";
import { getTeamScopeFromEvent } from "../selectors.js";

import { recordSubstitutionEvent } from "../../video/video-events.js";
import { ensureMetricsConfigDefaults } from "../../settings/rules.js";
import { opponentRoster } from "../../../domain/opponent-roster.js";
import { parseDelimitedTeamText } from "../storage/archive-actions.js";
import { renderOpponentLiberoTags } from "../imports/camp3-import.js";
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
      renderOpponentPlayersList,
      renderOpponentLiberoTags: (...args) => renderOpponentLiberoTags(...args),
      onRenameReferences: replaceOpponentPlayerNameEverywhere
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
    const restoredOpp = restoreOpponentAutoRoleBaseCourt();
    saveState();
    if (restored) {
      renderPlayers();
      renderLiberoChipsInline();
      renderLineupChips();
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
    cacheOpponentAutoRoleBaseCourt();
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
  syncAutoRoleP1AmericanToggle();
}

export function setIsServing(flag) {
  matchState.state.isServing = !!flag;
  saveState();
}

export function syncAutoLiberoSelects() {
  publishReactSettings();
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
  syncAutoLiberoSelects();
  renderPlayers();
  renderLiberoChipsInline();
  renderLineupChips();
}

export function getLastEventForScope(scope = "our") {
  const list = Array.isArray(matchState.state.events) ? matchState.state.events : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const ev = list[i];
    if (!ev || !ev.skillId) continue;
    if (ev.skillId === "manual") {
      const dir = (getPointDirection(ev));
      if (dir) {
        const evScope =
          (getTeamScopeFromEvent(ev));
        if (scope === "opponent") {
          if (evScope === "opponent") return ev;
        } else if (evScope !== "opponent") {
          return ev;
        }
      }
      continue;
    }
    const evScope =
      (getTeamScopeFromEvent(ev));
    if (scope === "opponent") {
      if (evScope === "opponent") return ev;
    } else if (evScope !== "opponent") {
      return ev;
    }
  }
  return null;
}

export function getCurrentPhase(scope = "our") {
  const last = getLastEventForScope(scope);
  const isServing = scope === "opponent" ? !matchState.state.isServing : matchState.state.isServing;
  if (last && last.skillId) {
    if (["pass", "second", "attack", "block", "defense"].includes(last.skillId)) {
      return "attack";
    }
    const dir = (getPointDirection(last));
    if (dir === "against") return "receive";
    if (dir === "for" && isServing) return "attack";
  }
  return isServing ? "attack" : "receive";
}

export function playersChanged(nextPlayers) {
  const normalizedNext = normalizePlayers(nextPlayers);
  const normalizedCurrent = normalizePlayers(matchState.state.players || []);
  if (normalizedNext.length !== normalizedCurrent.length) return true;
  return normalizedNext.some((name, idx) => name !== normalizedCurrent[idx]);
}

export function ensureCourtShape() {
  matchState.state.court = ensureCourtShapeFor(matchState.state.court);
}





export function cacheAutoRoleBaseCourt() {
  updateAutoRoleBaseCourtCache(matchState.state.court);
}

export function cacheOpponentAutoRoleBaseCourt() {
  updateOpponentAutoRoleBaseCourtCache(matchState.state.opponentCourt || []);
}

export function restoreAutoRoleBaseCourt() {
  if (!rosterLineupState.autoRoleBaseCourt || rosterLineupState.autoRoleBaseCourt.length !== 6) {
    if (matchState.state.autoRoleBaseCourt && matchState.state.autoRoleBaseCourt.length === 6) {
      rosterLineupState.autoRoleBaseCourt = cloneCourtLineup(matchState.state.autoRoleBaseCourt);
    }
  }
  if (!rosterLineupState.autoRoleBaseCourt || rosterLineupState.autoRoleBaseCourt.length !== 6) return false;
  const restored = cloneCourtLineup(rosterLineupState.autoRoleBaseCourt);
  matchState.state.court = restored;
  updateAutoRoleBaseCourtCache(restored);
  resetAutoRoleCache();
  return true;
}

export function restoreOpponentAutoRoleBaseCourt() {
  if (!rosterLineupState.opponentAutoRoleBaseCourt || rosterLineupState.opponentAutoRoleBaseCourt.length !== 6) {
    if (matchState.state.opponentAutoRoleBaseCourt && matchState.state.opponentAutoRoleBaseCourt.length === 6) {
      rosterLineupState.opponentAutoRoleBaseCourt = cloneCourtLineup(matchState.state.opponentAutoRoleBaseCourt);
    }
  }
  if (!rosterLineupState.opponentAutoRoleBaseCourt || rosterLineupState.opponentAutoRoleBaseCourt.length !== 6) return false;
  const restored = cloneCourtLineup(rosterLineupState.opponentAutoRoleBaseCourt);
  matchState.state.opponentCourt = restored;
  updateOpponentAutoRoleBaseCourtCache(restored);
  return true;
}

export function cleanCourtPlayers(target = matchState.state.court) {
  ensureCourtShape();
  const valid = new Set(matchState.state.players || []);
  matchState.state.captains = (matchState.state.captains || []).filter(name => valid.has(name)).slice(0, 1);
  const cleaned = ensureCourtShapeFor(target).map(slot => {
    const main = valid.has(slot.main) ? slot.main : "";
    const replaced = slot.replaced && valid.has(slot.replaced) ? slot.replaced : "";
    return { main, replaced };
  });
  if (target === matchState.state.court) {
    matchState.state.court = cleaned;
  } else {
    cleaned.forEach((slot, idx) => (target[idx] = slot));
  }
  cleanLiberos();
  ensureMetricsConfigDefaults();
  return cleaned;
}

export function registerLiberoPairForScope(replacedName, liberoName, scope = "our") {
  if (!replacedName || !liberoName) return;
  if (!isLiberoForScope(liberoName, scope)) return;
  const map = Object.assign({}, getTeamLiberoAutoMap(scope));
  map[replacedName] = liberoName;
  setTeamLiberoAutoMap(scope, map);
  if (!getTeamPreferredLibero(scope)) {
    setTeamPreferredLibero(scope, liberoName);
  }
}



export function roleToAutoCategory(roleLabel = "") {
  const r = (roleLabel || "").toUpperCase();
  if (r.startsWith("P")) return "P";
  if (r.startsWith("O")) return "O";
  if (r.startsWith("C")) return "C";
  if (r.startsWith("S")) return "S";
  return "";
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
  renderLiberoChipsInline();
  renderLineupChips();
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
  renderLiberoChipsInline();
  renderLineupChips();
  renderOpponentPlayers();
}

export function applyAutoLiberoSubstitutionToCourt(baseCourt, options = {}) {
  return applyAutoLiberoSubstitutionToCourtForScope(baseCourt, "our", options);
}

export function applyAutoLiberoSubstitutionToCourtForScope(baseCourt, scope = "our", options = {}) {
  const { skipServerOnServe = true } = options;
  if (!getTeamAutoLiberoBackline(scope)) return cloneCourtLineup(baseCourt);
  const autoRole = getTeamAutoLiberoRole(scope);
  if (!autoRole) return cloneCourtLineup(baseCourt);
  cleanLiberoAutoMapForScope(scope);
  const libSet = new Set(getTeamLiberos(scope));
  if (libSet.size === 0) return cloneCourtLineup(baseCourt);
  const liberoList = getTeamLiberos(scope).filter(n => libSet.has(n));
  const mapping = getTeamLiberoAutoMap(scope) || {};
  const shaped = removeLiberosAndRestoreForScope(baseCourt, scope).map(slot => Object.assign({}, slot));
  const preferred = getTeamPreferredLibero(scope);
  let primaryLibero = preferred && libSet.has(preferred) ? preferred : null;
  // normalizza eventuali doppi liberi già presenti
  for (let i = 0; i < shaped.length; i++) {
    const slot = shaped[i];
    if (libSet.has(slot.main)) {
      if (!primaryLibero) {
        primaryLibero = slot.main;
        if (slot.replaced) {
          registerLiberoPairForScope(slot.replaced, slot.main, scope);
        }
      } else {
        // secondo libero: rimuovilo e rimetti la titolare se nota
        if (slot.replaced) {
          shaped[i] = { main: slot.replaced, replaced: "" };
        } else {
          shaped[i] = { main: "", replaced: "" };
        }
      }
    }
  }
  if (!primaryLibero) {
    primaryLibero = liberoList[0] || null;
    setTeamPreferredLibero(scope, primaryLibero || "");
  }
  if (!primaryLibero) return shaped;
  const selCat = (autoRole || "").toUpperCase();
  const rotation = getTeamRotation(scope);
  const isServing = scope === "opponent" ? !matchState.state.isServing : !!matchState.state.isServing;
  let targetIdx = -1;
  rosterLineupState.BACK_ROW_INDEXES.forEach(idx => {
    if (targetIdx !== -1) return;
    if (skipServerOnServe && isServing && idx === 0) return;
    const roleHere = roleToAutoCategory(getRoleLabelForRotation(idx + 1, rotation)); // usa il ruolo corrente (ruotato)
    if (selCat === roleHere && !isLiberoForScope(shaped[idx].main, scope)) {
      targetIdx = idx;
    }
  });
  if (targetIdx === -1) return shaped;
  const slot = shaped[targetIdx] || { main: "", replaced: "" };
  const liberoName =
    (mapping[slot.main] && libSet.has(mapping[slot.main]) && mapping[slot.main]) || primaryLibero;
  if (!liberoName) return shaped;
  shaped[targetIdx] = { main: liberoName, replaced: slot.main || "" };
  registerLiberoPairForScope(slot.main || "", liberoName, scope);
  setTeamPreferredLibero(scope, liberoName);
  return shaped;
}

export function enforceAutoLiberoForState(options = {}) {
  enforceAutoLiberoForScope("our", options);
}

export function enforceAutoLiberoForScope(scope = "our", options = {}) {
  if (!getTeamAutoLiberoBackline(scope)) return;
  if (scope === "our") {
    ensureCourtShape();
  }
  let base;
  if (scope === "our") {
    base =
      matchState.state.autoRolePositioning && rosterLineupState.autoRoleBaseCourt && rosterLineupState.autoRoleBaseCourt.length === 6
        ? cloneCourtLineup(rosterLineupState.autoRoleBaseCourt)
        : cloneCourtLineup(matchState.state.court);
  } else {
    base = cloneCourtLineup(getTeamCourt(scope));
  }
  base = removeLiberosAndRestoreForScope(base, scope);
  const adjusted = applyAutoLiberoSubstitutionToCourtForScope(base, scope, options);
  setTeamCourt(scope, cloneCourtLineup(adjusted));
  if (scope === "our" && matchState.state.autoRolePositioning) {
    updateAutoRoleBaseCourtCache(cloneCourtLineup(adjusted));
    resetAutoRoleCache();
  }
}



export function getLockedMapForScope(scope = "our") {
  const map = {};
  const court = ensureCourtShapeFor(getTeamCourt(scope));
  court.forEach((slot, idx) => {
    if (slot.replaced && isLiberoForScope(slot.main, scope)) {
      map[slot.replaced] = idx;
    }
  });
  return map;
}

export function getUsedNamesForScope(scope = "our") {
  const used = new Set();
  const court = ensureCourtShapeFor(getTeamCourt(scope));
  court.forEach(slot => {
    if (slot.main) used.add(slot.main);
  });
  return used;
}

export function getReplacedByLiberosForScope(scope = "our") {
  const court = ensureCourtShapeFor(getTeamCourt(scope));
  const libSet = new Set(getTeamLiberos(scope));
  const list = [];
  court.forEach(slot => {
    if (slot.main && libSet.has(slot.main) && slot.replaced) {
      list.push(slot.replaced);
    }
  });
  return list;
}

export function canPlaceInSlotForScope(name, posIdx, showAlert = true, scope = "our") {
  if (!name) return true;
  const court = ensureCourtShapeFor(getTeamCourt(scope));
  const targetSlot = court[posIdx] || { main: "", replaced: "" };
  const libSlotIdx = court.findIndex(slot => isLiberoForScope(slot.main, scope) && slot.replaced === name);
  if (libSlotIdx !== -1) {
    if (libSlotIdx !== posIdx) {
      if (showAlert) alert("Questa giocatrice può rientrare solo nello slot del libero che la sta sostituendo.");
      return false;
    }
    return true;
  }
  if (isLiberoForScope(name, scope) && rosterLineupState.FRONT_ROW_INDEXES.has(posIdx)) {
    if (showAlert) alert("Non puoi mettere il libero in prima linea.");
    return false;
  }
  if (isLiberoForScope(name, scope)) {
    const anotherLiberoIdx = court.findIndex(
      slot => slot.main && slot.main !== name && isLiberoForScope(slot.main, scope)
    );
    if (anotherLiberoIdx !== -1 && anotherLiberoIdx !== posIdx) {
      if (showAlert) alert("Puoi avere solo un libero in campo alla volta.");
      return false;
    }
  }
  const lockedMap = getLockedMapForScope(scope);
  if (lockedMap[name] !== undefined && lockedMap[name] !== posIdx && targetSlot.replaced !== name) {
    if (showAlert) alert("Questa giocatrice può rientrare solo nella sua posizione (sostituita dal libero).");
    return false;
  }
  return true;
}

export function reserveNamesInCourt(name, court = matchState.state.court) {
  const next = rosterLineupState.lineupCore.reserveNamesInCourt(name, court);
  if (court === matchState.state.court) {
    matchState.state.court = next;
  } else {
    next.forEach((slot, idx) => (court[idx] = slot));
  }
  return next;
}

export function resetAutoRoleCache() {
  rosterLineupState.autoRolePhaseApplied = "";
  rosterLineupState.autoRoleRotationApplied = null;
  rosterLineupState.autoRoleRenderedCourt = null;
}

export function updateAutoRoleBaseCourtCache(base) {
  const shaped = cloneCourtLineup(base);
  rosterLineupState.autoRoleBaseCourt = shaped;
  matchState.state.autoRoleBaseCourt = shaped;
}

export function updateOpponentAutoRoleBaseCourtCache(base) {
  const shaped = cloneCourtLineup(base);
  rosterLineupState.opponentAutoRoleBaseCourt = shaped;
  matchState.state.opponentAutoRoleBaseCourt = shaped;
}

export function sanitizeAutoRoleBaseCourtForScope(scope = "our") {
  const isOpponent = scope === "opponent";
  const valid = new Set(isOpponent ? matchState.state.opponentPlayers || [] : matchState.state.players || []);
  const cached = isOpponent ? rosterLineupState.opponentAutoRoleBaseCourt : rosterLineupState.autoRoleBaseCourt;
  const stateCached = isOpponent ? matchState.state.opponentAutoRoleBaseCourt : matchState.state.autoRoleBaseCourt;
  const source =
    Array.isArray(cached) && cached.length === 6
      ? cached
      : Array.isArray(stateCached) && stateCached.length === 6
        ? stateCached
        : null;
  if (!source) return false;
  const shaped = ensureCourtShapeFor(source);
  const hasInvalid = shaped.some(slot => {
    const main = (slot && slot.main) || "";
    const replaced = (slot && slot.replaced) || "";
    return (main && !valid.has(main)) || (replaced && !valid.has(replaced));
  });
  if (!hasInvalid) return false;
  const fallback = ensureCourtShapeFor(isOpponent ? matchState.state.opponentCourt || [] : matchState.state.court || []);
  if (isOpponent) {
    updateOpponentAutoRoleBaseCourtCache(fallback);
  } else {
    updateAutoRoleBaseCourtCache(fallback);
    resetAutoRoleCache();
  }
  return true;
}

export function commitCourtChange(baseCourt, options = {}) {
  const { clean = true } = options;
  if (clean) cleanCourtPlayers(baseCourt);
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
  renderLiberoChipsInline();
  renderLineupChips();
  updateRotationDisplay();
}

export function commitCourtChangeForScope(baseCourt, scope = "our") {
  if (scope === "our") {
    commitCourtChange(baseCourt);
    return;
  }
  matchState.state.opponentCourt = ensureCourtShapeFor(baseCourt);
  if (matchState.state.autoRolePositioning) {
    updateOpponentAutoRoleBaseCourtCache(matchState.state.opponentCourt);
  }
  if (typeof enforceAutoLiberoForScope === "function") {
    enforceAutoLiberoForScope("opponent", { skipServerOnServe: true });
  }
  saveState();
  renderOpponentPlayers();
  renderOpponentLiberoChipsInline();
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
    });
  }
}

export function initStats() {
  matchState.state.stats = {};
  matchState.state.players.forEach((_, idx) => {
    matchState.state.stats[idx] = {};
    SKILLS.forEach(skill => {
      matchState.state.stats[idx][skill.id] = {
        "#": 0,
        "+": 0,
        "!": 0,
        "-": 0,
        "=": 0,
        "/": 0
      };
    });
  });
}

export function syncCurrentSetUI(value) {
  const setValue = String(value || 1);

  if (typeof document !== "undefined") {
    const label = "Set " + setValue;
    const display = document.getElementById("current-set-display");

  }
}

export function renderPlayersManagerList() { publishReactSettings(); }

export function renderOpponentPlayersList() {publishReactSettings();}
