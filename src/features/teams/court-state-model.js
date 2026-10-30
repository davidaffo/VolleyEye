import { getBaseZoneForPlayer, ensureCourtShapeFor, cloneCourtLineup } from "./court-model.js";
import { getPlayersForScope, getTeamScopeFromEvent, isServingForScope } from "./selectors.js";
import { session as matchState, SKILLS } from "../../../js/globals.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";

import {
  isLiberoForScope,
  removeLiberosAndRestoreForScope,
} from "./libero-model.js";
import { getTeamAutoLiberoRole } from "./auto-libero-selectors.js";
import {
  getTeamPlayers,
  getTeamLiberos,
  getTeamCourt,
  getTeamAutoLiberoBackline,
  getTeamRotation,
  getTeamLiberoAutoMap,
  setTeamLiberoAutoMap,
  getTeamPreferredLibero,
  setTeamPreferredLibero,
  sortNamesByNumber,
} from "./roster-data.js";
import { getRoleLabelForRotation } from "./roles.js";
import { getPointDirection } from "../analysis/scores.js";

import { getServeDisplayCourt } from "./serve-court.js";
import { normalizePlayers } from "../../domain/player-names.js";
import { ensureMetricsConfigDefaults } from "../settings/rules.js";

export function getLastEventForScope(scope = "our") {
  const list = Array.isArray(matchState.state.events)
    ? matchState.state.events
    : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const ev = list[i];
    if (!ev || !ev.skillId) continue;
    if (ev.skillId === "manual") {
      const dir = getPointDirection(ev);
      if (dir) {
        const evScope = getTeamScopeFromEvent(ev);
        if (scope === "opponent") {
          if (evScope === "opponent") return ev;
        } else if (evScope !== "opponent") {
          return ev;
        }
      }
      continue;
    }
    const evScope = getTeamScopeFromEvent(ev);
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
  const isServing =
    scope === "opponent"
      ? !matchState.state.isServing
      : matchState.state.isServing;
  if (last && last.skillId) {
    if (
      ["pass", "second", "attack", "block", "defense"].includes(last.skillId)
    ) {
      return "attack";
    }
    const dir = getPointDirection(last);
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

export function cacheAutoRoleBaseCourt(scope = "our") {
  const opponent = scope === "opponent";
  updateAutoRoleBaseCourtCache(
    opponent ? matchState.state.opponentCourt || [] : matchState.state.court,
    scope,
  );
}

export function restoreAutoRoleBaseCourt(scope = "our") {
  const opponent = scope === "opponent",
    cacheKey = opponent ? "opponentAutoRoleBaseCourt" : "autoRoleBaseCourt",
    courtKey = opponent ? "opponentCourt" : "court";
  let cached = opponent
    ? rosterLineupState.opponentAutoRoleBaseCourt
    : rosterLineupState.autoRoleBaseCourt;
  if (!cached || cached.length !== 6) {
    if (matchState.state[cacheKey] && matchState.state[cacheKey].length === 6) {
      cached = cloneCourtLineup(matchState.state[cacheKey]);
      if (opponent) rosterLineupState.opponentAutoRoleBaseCourt = cached;
      else rosterLineupState.autoRoleBaseCourt = cached;
    }
  }
  if (!cached || cached.length !== 6) return false;
  const restored = cloneCourtLineup(cached);
  matchState.state[courtKey] = restored;
  updateAutoRoleBaseCourtCache(restored, scope);
  if (!opponent) resetAutoRoleCache();
  return true;
}

export function cleanCourtPlayers(target = matchState.state.court) {
  ensureCourtShape();
  const valid = new Set(matchState.state.players || []);
  matchState.state.captains = (matchState.state.captains || [])
    .filter((name) => valid.has(name))
    .slice(0, 1);
  const cleaned = ensureCourtShapeFor(target).map((slot) => {
    const main = valid.has(slot.main) ? slot.main : "";
    const replaced =
      slot.replaced && valid.has(slot.replaced) ? slot.replaced : "";
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

export function registerLiberoPairForScope(
  replacedName,
  liberoName,
  scope = "our",
) {
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

export function applyAutoLiberoSubstitutionToCourt(baseCourt, options = {}) {
  return applyAutoLiberoSubstitutionToCourtForScope(baseCourt, "our", options);
}

export function applyAutoLiberoSubstitutionToCourtForScope(
  baseCourt,
  scope = "our",
  options = {},
) {
  const { skipServerOnServe = true } = options;
  if (!getTeamAutoLiberoBackline(scope)) return cloneCourtLineup(baseCourt);
  const autoRole = getTeamAutoLiberoRole(scope);
  if (!autoRole) return cloneCourtLineup(baseCourt);
  cleanLiberoAutoMapForScope(scope);
  const libSet = new Set(getTeamLiberos(scope));
  if (libSet.size === 0) return cloneCourtLineup(baseCourt);
  const liberoList = getTeamLiberos(scope).filter((n) => libSet.has(n));
  const mapping = getTeamLiberoAutoMap(scope) || {};
  const shaped = removeLiberosAndRestoreForScope(baseCourt, scope).map((slot) =>
    Object.assign({}, slot),
  );
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
  const isServing =
    scope === "opponent"
      ? !matchState.state.isServing
      : !!matchState.state.isServing;
  let targetIdx = -1;
  rosterLineupState.BACK_ROW_INDEXES.forEach((idx) => {
    if (targetIdx !== -1) return;
    if (skipServerOnServe && isServing && idx === 0) return;
    const roleHere = roleToAutoCategory(
      getRoleLabelForRotation(idx + 1, rotation),
    ); // usa il ruolo corrente (ruotato)
    if (selCat === roleHere && !isLiberoForScope(shaped[idx].main, scope)) {
      targetIdx = idx;
    }
  });
  if (targetIdx === -1) return shaped;
  const slot = shaped[targetIdx] || { main: "", replaced: "" };
  const liberoName =
    (mapping[slot.main] &&
      libSet.has(mapping[slot.main]) &&
      mapping[slot.main]) ||
    primaryLibero;
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
      matchState.state.autoRolePositioning &&
      rosterLineupState.autoRoleBaseCourt &&
      rosterLineupState.autoRoleBaseCourt.length === 6
        ? cloneCourtLineup(rosterLineupState.autoRoleBaseCourt)
        : cloneCourtLineup(matchState.state.court);
  } else {
    base = cloneCourtLineup(getTeamCourt(scope));
  }
  base = removeLiberosAndRestoreForScope(base, scope);
  const adjusted = applyAutoLiberoSubstitutionToCourtForScope(
    base,
    scope,
    options,
  );
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
  court.forEach((slot) => {
    if (slot.main) used.add(slot.main);
  });
  return used;
}

export function getReplacedByLiberosForScope(scope = "our") {
  const court = ensureCourtShapeFor(getTeamCourt(scope));
  const libSet = new Set(getTeamLiberos(scope));
  const list = [];
  court.forEach((slot) => {
    if (slot.main && libSet.has(slot.main) && slot.replaced) {
      list.push(slot.replaced);
    }
  });
  return list;
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

export function updateAutoRoleBaseCourtCache(base, scope = "our") {
  const key =
    scope === "opponent" ? "opponentAutoRoleBaseCourt" : "autoRoleBaseCourt";
  const shaped = cloneCourtLineup(base);
  if (scope === "opponent")
    rosterLineupState.opponentAutoRoleBaseCourt = shaped;
  else rosterLineupState.autoRoleBaseCourt = shaped;
  matchState.state[key] = shaped;
}

export function sanitizeAutoRoleBaseCourtForScope(scope = "our") {
  const isOpponent = scope === "opponent";
  const valid = new Set(
    isOpponent
      ? matchState.state.opponentPlayers || []
      : matchState.state.players || [],
  );
  const cached = isOpponent
    ? rosterLineupState.opponentAutoRoleBaseCourt
    : rosterLineupState.autoRoleBaseCourt;
  const stateCached = isOpponent
    ? matchState.state.opponentAutoRoleBaseCourt
    : matchState.state.autoRoleBaseCourt;
  const source =
    Array.isArray(cached) && cached.length === 6
      ? cached
      : Array.isArray(stateCached) && stateCached.length === 6
        ? stateCached
        : null;
  if (!source) return false;
  const shaped = ensureCourtShapeFor(source);
  const hasInvalid = shaped.some((slot) => {
    const main = (slot && slot.main) || "";
    const replaced = (slot && slot.replaced) || "";
    return (main && !valid.has(main)) || (replaced && !valid.has(replaced));
  });
  if (!hasInvalid) return false;
  const fallback = ensureCourtShapeFor(
    isOpponent
      ? matchState.state.opponentCourt || []
      : matchState.state.court || [],
  );
  if (isOpponent) {
    updateAutoRoleBaseCourtCache(fallback, "opponent");
  } else {
    updateAutoRoleBaseCourtCache(fallback);
    resetAutoRoleCache();
  }
  return true;
}

export function initStats() {
  matchState.state.stats = {};
  matchState.state.players.forEach((_, idx) => {
    matchState.state.stats[idx] = {};
    SKILLS.forEach((skill) => {
      matchState.state.stats[idx][skill.id] = {
        "#": 0,
        "+": 0,
        "!": 0,
        "-": 0,
        "=": 0,
        "/": 0,
      };
    });
  });
}

export function orderLiberosByPreference(
  names,
  scope = "our",
  numbersMap = {},
) {
  const list = sortNamesByNumber(names, numbersMap);
  const preferred = getTeamPreferredLibero(scope);
  if (preferred && list.includes(preferred)) {
    return [preferred].concat(list.filter((n) => n !== preferred));
  }
  return list;
}

export function cleanLiberos() {
  const valid = new Set(matchState.state.players || []);
  matchState.state.liberos = (matchState.state.liberos || []).filter((n) =>
    valid.has(n),
  );
  cleanLiberoAutoMap();
}

export function cleanLiberoAutoMap() {
  cleanLiberoAutoMapForScope("our");
}

export function cleanLiberoAutoMapForScope(scope = "our") {
  const validPlayers = new Set(getTeamPlayers(scope));
  const libSet = new Set(getTeamLiberos(scope));
  const map = getTeamLiberoAutoMap(scope) || {};
  const cleaned = {};
  Object.entries(map).forEach(([replaced, libero]) => {
    if (validPlayers.has(replaced) && libSet.has(libero)) {
      cleaned[replaced] = libero;
    }
  });
  setTeamLiberoAutoMap(scope, cleaned);
}

export function releaseReplaced(name, keepIdx, court = matchState.state.court) {
  const updated = rosterLineupState.lineupCore.releaseReplacedFromCourt(
    court,
    name,
    keepIdx,
  );
  if (court === matchState.state.court) {
    matchState.state.court = updated;
  } else {
    updated.forEach((slot, idx) => (court[idx] = slot));
  }
  return;
}

export function setTeamCourt(scope = "our", court = []) {
  if (scope === "opponent") {
    matchState.state.opponentCourt = court;
    if (matchState.state.autoRolePositioning) {
      updateAutoRoleBaseCourtCache(court, "opponent");
    }
  } else {
    matchState.state.court = court;
  }
}

export function buildReceiveDisplayMapping(court, rotation, scope = "our") {
  const perm =
    rosterLineupState.buildAutoRolePermutation({
      baseLineup: court,
      rotation,
      phase: "receive",
      isServing: matchState.state.isServing,
      autoRoleP1American:
        scope === "opponent"
          ? !!matchState.state.opponentAutoRoleP1American
          : !!matchState.state.autoRoleP1American,
    }) || [];
  return toCourtDisplayMapping(perm);
}

export function getAutoRoleDisplayCourt(forSkillId = null, scope = "our") {
  const useAuto = !!matchState.state.autoRolePositioning;
  if (useAuto) {
    sanitizeAutoRoleBaseCourtForScope(scope);
  }
  const opponentBase =
    useAuto &&
    scope === "opponent" &&
    matchState.state.opponentAutoRoleBaseCourt &&
    matchState.state.opponentAutoRoleBaseCourt.length === 6
      ? ensureCourtShapeFor(matchState.state.opponentAutoRoleBaseCourt)
      : ensureCourtShapeFor(matchState.state.opponentCourt);
  const baseCourt =
    useAuto && scope === "our" && rosterLineupState.autoRoleBaseCourt
      ? ensureCourtShapeFor(rosterLineupState.autoRoleBaseCourt)
      : scope === "opponent"
        ? opponentBase
        : ensureCourtShapeFor(matchState.state.court);
  const effectiveBase = baseCourt;
  if (!useAuto) {
    return effectiveBase.map((slot, idx) => ({ slot, idx }));
  }
  if (forSkillId === "serve") {
    const servingCourt = getServeDisplayCourt(scope);
    return ensureCourtShapeFor(servingCourt || effectiveBase).map(
      (slot, idx) => ({ slot, idx }),
    );
  }
  if (forSkillId === "pass") {
    const rotation =
      scope === "opponent"
        ? matchState.state.opponentRotation
        : matchState.state.rotation;
    return buildReceiveDisplayMapping(effectiveBase, rotation || 1, scope);
  }
  const phase = forSkillId
    ? getCurrentPhase(scope)
    : isServingForScope(scope)
      ? "attack"
      : "receive";

  const perm =
    rosterLineupState.buildAutoRolePermutation({
      baseLineup: effectiveBase,
      rotation:
        scope === "opponent"
          ? matchState.state.opponentRotation || 1
          : matchState.state.rotation || 1,
      phase,
      isServing:
        scope === "opponent"
          ? !matchState.state.isServing
          : matchState.state.isServing,
      autoRoleP1American:
        scope === "opponent"
          ? !!matchState.state.opponentAutoRoleP1American
          : !!matchState.state.autoRoleP1American,
    }) || [];
  return toCourtDisplayMapping(perm);
}

export function prepareAutoRolePositioning() {
  if (!matchState.state.autoRolePositioning) return false;
  ensureCourtShape();
  sanitizeAutoRoleBaseCourtForScope("our");
  enforceAutoLiberoForState({ skipServerOnServe: true });
  const phase = getCurrentPhase("our");
  const rot = matchState.state.rotation || 1;
  if (
    rosterLineupState.autoRolePhaseApplied === phase &&
    rosterLineupState.autoRoleRotationApplied === rot
  )
    return false;
  if (!rosterLineupState.autoRoleBaseCourt) {
    if (
      matchState.state.autoRoleBaseCourt &&
      matchState.state.autoRoleBaseCourt.length === 6
    ) {
      rosterLineupState.autoRoleBaseCourt = cloneCourtLineup(
        matchState.state.autoRoleBaseCourt,
      );
    } else {
      updateAutoRoleBaseCourtCache(matchState.state.court);
    }
  }
  const baseLineup =
    rosterLineupState.autoRoleBaseCourt &&
    rosterLineupState.autoRoleBaseCourt.length === 6
      ? cloneCourtLineup(rosterLineupState.autoRoleBaseCourt)
      : ensureCourtShapeFor(matchState.state.court);
  const permuted = rosterLineupState.applyPhasePermutation({
    lineup: baseLineup,
    rotation: rot,
    phase,
    isServing: matchState.state.isServing,
    liberos: matchState.state.liberos || [],
    autoRoleP1American: !!matchState.state.autoRoleP1American,
  });
  rosterLineupState.autoRoleRenderedCourt = permuted; // overlay per la vista, non alteriamo il base
  rosterLineupState.autoRolePhaseApplied = phase;
  rosterLineupState.autoRoleRotationApplied = rot;
  return true;
}

export function getCourtPlacementError(name, posIdx, scope = "our") {
  if (!name) return "";
  const court = ensureCourtShapeFor(getTeamCourt(scope));
  const targetSlot = court[posIdx] || { main: "", replaced: "" };
  const libSlotIdx = court.findIndex(
    (slot) => isLiberoForScope(slot.main, scope) && slot.replaced === name,
  );
  if (libSlotIdx !== -1) {
    if (libSlotIdx !== posIdx) {
      return "Questa giocatrice può rientrare solo nello slot del libero che la sta sostituendo.";
    }
    return "";
  }
  if (
    isLiberoForScope(name, scope) &&
    rosterLineupState.FRONT_ROW_INDEXES.has(posIdx)
  ) {
    return "Non puoi mettere il libero in prima linea.";
  }
  if (isLiberoForScope(name, scope)) {
    const anotherLiberoIdx = court.findIndex(
      (slot) =>
        slot.main && slot.main !== name && isLiberoForScope(slot.main, scope),
    );
    if (anotherLiberoIdx !== -1 && anotherLiberoIdx !== posIdx) {
      return "Puoi avere solo un libero in campo alla volta.";
    }
  }
  const lockedMap = getLockedMapForScope(scope);
  if (
    lockedMap[name] !== undefined &&
    lockedMap[name] !== posIdx &&
    targetSlot.replaced !== name
  ) {
    return "Questa giocatrice può rientrare solo nella sua posizione (sostituita dal libero).";
  }
  return "";
}

function toCourtDisplayMapping(permutation) {
  return permutation.map((item) => ({
    slot: (item && item.slot) || { main: "", replaced: "" },
    idx: typeof item.idx === "number" ? item.idx : 0,
  }));
}

export function rotateCourtState(direction, scope = "our") {
  const opponent = scope === "opponent";
  if (!opponent) ensureCourtShape();
  const cached = opponent
    ? rosterLineupState.opponentAutoRoleBaseCourt
    : rosterLineupState.autoRoleBaseCourt;
  const base = ensureCourtShapeFor(
    matchState.state.autoRolePositioning && cached
      ? cached
      : getTeamCourt(scope),
  );
  // The public controls historically use different fallbacks for an omitted direction.
  const clockwise = opponent ? direction !== "ccw" : direction === "cw";
  const rotation = opponent
    ? matchState.state.opponentRotation || 1
    : matchState.state.rotation;
  const nextRotation = clockwise
    ? opponent
      ? (rotation % 6 || 0) + 1
      : ((rotation || 1) % 6) + 1
    : rotation === 1
      ? 6
      : rotation - 1;
  if (opponent) matchState.state.opponentRotation = nextRotation;
  else matchState.state.rotation = nextRotation;
  const rotated = clockwise
    ? [base[5], ...base.slice(0, 5)]
    : [...base.slice(1), base[0]];
  const liberos = getTeamLiberos(scope);
  const restored = rotated.map((slot, idx) =>
    (!opponent || slot.main) &&
    liberos.includes(slot.main) &&
    rosterLineupState.FRONT_ROW_INDEXES.has(idx)
      ? { main: slot.replaced || "", replaced: "" }
      : { ...slot },
  );
  const withLibero = applyAutoLiberoSubstitutionToCourtForScope(
    restored,
    scope,
    { skipServerOnServe: true },
  );
  setTeamCourt(scope, withLibero);
  if (!opponent) {
    if (matchState.state.autoRolePositioning)
      updateAutoRoleBaseCourtCache(withLibero);
    resetAutoRoleCache();
  }
  return !opponent && !!matchState.state.autoRolePositioning;
}

export function getCurrentZoneForPlayer(
  playerIdx,
  forSkillId = null,
  scope = "our",
) {
  const players = getPlayersForScope(scope);
  if (typeof playerIdx !== "number" || !players || !players[playerIdx])
    return null;
  const name = players[playerIdx];
  if (matchState.state.autoRolePositioning && forSkillId) {
    const displayCourt = getAutoRoleDisplayCourt(forSkillId, scope);
    const displayIdx = displayCourt.findIndex(
      (item) =>
        item &&
        item.slot &&
        (item.slot.main === name || item.slot.replaced === name),
    );
    if (displayIdx !== -1) return displayIdx + 1;
  }
  return getBaseZoneForPlayer(playerIdx, scope);
}
