import { getDefaultSetStartForScope, getMatchInitialSetStart, getDerivedServeForSetStart } from "../teams/set-start-model.js";
import { getCourtShape, cloneCourt } from "../teams/court-model.js";
import { removeLiberosAndRestoreForScope } from "../teams/libero-model.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { getLiberosForScope } from "../teams/selectors.js";
import { lineup } from "../../domain/lineup.js";
import { session as matchState } from "../../../js/globals.js";

export function cloneSetMap(map) {
  return JSON.parse(JSON.stringify(map || {}));
}

export function getNextSetEntry(scope) {
  if (!scoutUiState.nextSetDraft) return null;
  return scope === "opponent" ? scoutUiState.nextSetDraft.opponent : scoutUiState.nextSetDraft.our;
}

export function updateNextSetEntry(scope, entry) {
  if (!scoutUiState.nextSetDraft || !entry) return;
  if (scope === "opponent") {
    scoutUiState.nextSetDraft.opponent = entry;
  } else {
    scoutUiState.nextSetDraft.our = entry;
  }
}

export function setNextSetPlayer(scope, posIdx, name) {
  const entry = getNextSetEntry(scope);
  if (!entry) return;
  const liberos = getLiberosForScope(scope);
  const core = lineup;
  let nextCourt = [];
  if (core && typeof core.setPlayerOnCourt === "function") {
    nextCourt = core.setPlayerOnCourt({
      court: entry.court || [],
      posIdx,
      playerName: name,
      liberos
    });
  } else {
    nextCourt = getCourtShape(entry.court || []).map((slot, idx) => {
      const updated = Object.assign({}, slot);
      if (updated.main === name) updated.main = "";
      if (updated.replaced === name) updated.replaced = "";
      if (idx === posIdx) updated.main = name;
      return updated;
    });
  }
  updateNextSetEntry(scope, Object.assign({}, entry, { court: nextCourt }));
}

export function swapNextSetSlots(scope, fromIdx, toIdx) {
  const entry = getNextSetEntry(scope);
  if (!entry) return;
  const core = lineup;
  let nextCourt = [];
  if (core && typeof core.swapCourtSlots === "function") {
    nextCourt = core.swapCourtSlots({
      court: entry.court || [],
      fromIdx,
      toIdx
    });
  } else {
    nextCourt = getCourtShape(entry.court || []);
    const tmp = nextCourt[fromIdx];
    nextCourt[fromIdx] = nextCourt[toIdx];
    nextCourt[toIdx] = tmp;
  }
  updateNextSetEntry(scope, Object.assign({}, entry, { court: nextCourt }));
}

export function clearNextSetSlot(scope, posIdx) {
  const entry = getNextSetEntry(scope);
  if (!entry) return;
  const liberos = new Set(getLiberosForScope(scope));
  const nextCourt = getCourtShape(entry.court || []).map((slot, idx) => {
    if (idx !== posIdx) return slot;
    if (liberos.has(slot.main) && slot.replaced) return { main: slot.replaced, replaced: "" };
    return { main: "", replaced: "" };
  });
  updateNextSetEntry(scope, Object.assign({}, entry, { court: nextCourt }));
}

export function buildNextSetDraft(setNum) {
  const nextSet = Math.min(5, Math.max(1, setNum || 1));
  const defaultsOur = getDefaultSetStartForScope("our");
  const defaultsOpp = getDefaultSetStartForScope("opponent");
  const initialOur = getMatchInitialSetStart("our");
  const initialOpp = getMatchInitialSetStart("opponent");
  const savedStart = matchState.state.setStarts && matchState.state.setStarts[nextSet] ? matchState.state.setStarts[nextSet] : null;
  const savedOur = savedStart && savedStart.our ? savedStart.our : null;
  const savedOpp = savedStart && savedStart.opponent ? savedStart.opponent : null;
  const baseOurCourt =
    savedOur && savedOur.court
      ? cloneCourt(savedOur.court)
      : initialOur && initialOur.court
      ? cloneCourt(initialOur.court)
      : defaultsOur && defaultsOur.court
      ? cloneCourt(defaultsOur.court)
      : (removeLiberosAndRestoreForScope(matchState.state.court || [], "our"));
  const baseOppCourt =
    savedOpp && savedOpp.court
      ? cloneCourt(savedOpp.court)
      : initialOpp && initialOpp.court
      ? cloneCourt(initialOpp.court)
      : defaultsOpp && defaultsOpp.court
      ? cloneCourt(defaultsOpp.court)
      : (removeLiberosAndRestoreForScope(matchState.state.opponentCourt || [], "opponent"));
  const our = {
    court: cloneCourt(baseOurCourt),
    rotation:
      savedOur && typeof savedOur.rotation === "number"
        ? savedOur.rotation
        : initialOur && initialOur.rotation
          ? initialOur.rotation
          : defaultsOur && defaultsOur.rotation
          ? defaultsOur.rotation
          : matchState.state.rotation || 1
  };
  const opponent = {
    court: cloneCourt(baseOppCourt),
    rotation:
      savedOpp && typeof savedOpp.rotation === "number"
        ? savedOpp.rotation
        : initialOpp && initialOpp.rotation
          ? initialOpp.rotation
          : defaultsOpp && defaultsOpp.rotation
          ? defaultsOpp.rotation
          : matchState.state.opponentRotation || 1
  };
  const serveDefault = getDerivedServeForSetStart(nextSet);
  return {
    setNum: nextSet,
    our,
    opponent,
    swapCourt: savedStart ? !!savedStart.swapCourt : nextSet > 1 ? !matchState.state.courtSideSwapped : false,
    isServing: serveDefault
  };
}

export function updateNextSetOption(key, value, relative = false) {
  if (!scoutUiState.nextSetDraft || !["swapCourt", "isServing"].includes(key)) return false;
  scoutUiState.nextSetDraft[key] = key === "swapCourt" && relative
    ? !!value !== !!matchState.state.courtSideSwapped : !!value;
  return true;
}
