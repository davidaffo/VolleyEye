
import { SKILLS, session as matchState } from '../../../js/globals.js';
import { session as scoutUiState } from '../state/scout-ui.js';
import { getPlayersForScope, getPlayerNumbersForScope, getTeamScopeFromEvent } from '../teams/selectors.js';
import { getAnalysisCourtSide, getAnalysisTeamScope } from './filter-model.js';
import { removeLiberosAndRestoreForScope } from '../teams/libero-model.js';
import { cloneCourt } from '../teams/court-model.js';
import { getDefaultSetStartForScope } from '../teams/set-start-model.js';
import { getRoleLabelForRotation } from '../teams/roles.js';
import { emptyCounts, normalizeCounts, mergeCounts } from '../../domain/counts.js';
import { formatNameWithNumberFor, formatNameWithNumber } from '../teams/roster-data.js';
export function getSkillLabel(skillId) {
  const skill = SKILLS.find(s => s.id === skillId);
  return (skill && skill.label) || skillId || "Fondamentale";
}

export function getErrorTypeLabel(typeId) {
  const item = scoutUiState.ERROR_TYPES.find(t => t.id === typeId);
  return (item && item.label) || "Generico";
}

export function ensurePlayerAnalysisState() {
  if (!matchState.state.uiPlayerAnalysis || typeof matchState.state.uiPlayerAnalysis !== "object") {
    matchState.state.uiPlayerAnalysis = {
      playerIdx: null,
      compareEnabled: false,
      comparePlayerIdx: null,
      showAttack: true,
      showServe: true,
      showSecond: false,
      courtSideByScope: { our: "near", opponent: "far" }
    };
  }
  const prefs = matchState.state.uiPlayerAnalysis;
  prefs.showAttack = prefs.showAttack !== false;
  prefs.showServe = prefs.showServe !== false;
  prefs.showSecond = prefs.showSecond === true;
  if (!prefs.courtSideByScope || typeof prefs.courtSideByScope !== "object") {
    const fallback = typeof prefs.courtSide === "string" ? prefs.courtSide : "near";
    prefs.courtSideByScope = { our: getAnalysisCourtSide(fallback), opponent: "far" };
  } else {
    prefs.courtSideByScope = Object.assign({ our: "near", opponent: "far" }, prefs.courtSideByScope);
    prefs.courtSideByScope.our = getAnalysisCourtSide(prefs.courtSideByScope.our);
    prefs.courtSideByScope.opponent = getAnalysisCourtSide(prefs.courtSideByScope.opponent);
  }
  if (typeof prefs.playerIdx !== "number") {
    prefs.playerIdx = null;
  }
  prefs.compareEnabled = prefs.compareEnabled === true;
  if (typeof prefs.comparePlayerIdx !== "number") {
    prefs.comparePlayerIdx = null;
  }
  return prefs;
}

export function getPlayerAnalysisPlayerIdx() {
  const prefs = ensurePlayerAnalysisState();
  const players = getPlayersForScope(getAnalysisTeamScope());
  if (!players.length) {
    prefs.playerIdx = null;
    return null;
  }
  if (typeof prefs.playerIdx !== "number" || prefs.playerIdx < 0 || prefs.playerIdx >= players.length) {
    prefs.playerIdx = 0;
  }
  return prefs.playerIdx;
}

export function getPlayerAnalysisCompareIdx() {
  const prefs = ensurePlayerAnalysisState();
  const players = getPlayersForScope(getAnalysisTeamScope());
  if (!prefs.compareEnabled || !players.length) {
    prefs.comparePlayerIdx = null;
    return null;
  }
  const primaryIdx = getPlayerAnalysisPlayerIdx();
  const isInvalid =
    typeof prefs.comparePlayerIdx !== "number" ||
    prefs.comparePlayerIdx < 0 ||
    prefs.comparePlayerIdx >= players.length ||
    prefs.comparePlayerIdx === primaryIdx;
  if (isInvalid) {
    const fallbackIdx = players.findIndex((_name, idx) => idx !== primaryIdx);
    prefs.comparePlayerIdx = fallbackIdx >= 0 ? fallbackIdx : null;
  }
  return prefs.comparePlayerIdx;
}

export function ensureSetStartSnapshot(setNum) {
  const targetSet = parseInt(setNum, 10) || matchState.state.currentSet || 1;
  matchState.state.setStarts = matchState.state.setStarts || {};
  if (matchState.state.setStarts[targetSet]) return;
  const ourCourt =
    (removeLiberosAndRestoreForScope(matchState.state.court || [], "our"));
  const oppCourt =
    (removeLiberosAndRestoreForScope(matchState.state.opponentCourt || [], "opponent"));
  matchState.state.setStarts[targetSet] = {
    our: { court: cloneCourt(ourCourt || []), rotation: matchState.state.rotation || 1 },
    opponent: { court: cloneCourt(oppCourt || []), rotation: matchState.state.opponentRotation || 1 },
    swapCourt: !!matchState.state.courtSideSwapped,
    isServing: !!matchState.state.isServing
  };
}

export function getPlayedSetNumbers() {
  const setNums = new Set();
  (matchState.state.events || []).forEach(ev => {
    const num = parseInt(ev && ev.set, 10);
    if (num) setNums.add(num);
  });
  return Array.from(setNums).sort((a, b) => a - b);
}

export function getSetStartEntryForScope(setNum, scope) {
  const entry = matchState.state.setStarts && matchState.state.setStarts[setNum];
  if (entry) {
    const data = scope === "opponent" ? entry.opponent : entry.our;
    if (data && Array.isArray(data.court)) {
      return { court: data.court, rotation: typeof data.rotation === "number" ? data.rotation : 1 };
    }
  }
  if (setNum === 1) {
    const fallback = getDefaultSetStartForScope(scope);
    if (fallback) return fallback;
  }
  return null;
}

export function makePlayerNameKey(name) {
  return String(name || "").trim().toLowerCase();
}

export function buildSetStartInfoList(setNumbers, scope) {
  const substitutionsBySet = new Map();
  (setNumbers || []).forEach(num => substitutionsBySet.set(num, new Set()));
  (matchState.state.events || []).forEach(ev => {
    if (!ev || ev.actionType !== "substitution") return;
    const setNum = parseInt(ev.set, 10) || 1;
    if (!substitutionsBySet.has(setNum)) return;
    if (getTeamScopeFromEvent(ev) !== scope) return;
    const playerIn = makePlayerNameKey(ev.playerIn || "");
    if (playerIn) substitutionsBySet.get(setNum).add(playerIn);
  });
  return (setNumbers || []).map(setNum => {
    const entry = getSetStartEntryForScope(setNum, scope);
    const fullEntry = matchState.state.setStarts && matchState.state.setStarts[setNum];
    const scopeEntry = fullEntry
      ? scope === "opponent"
        ? fullEntry.opponent
        : fullEntry.our
      : null;
    const positions = new Map();
    if (entry && Array.isArray(entry.court)) {
      entry.court.forEach((slot, idx) => {
        const name = typeof slot === "string" ? slot : slot && typeof slot === "object" ? slot.main || "" : "";
        const key = makePlayerNameKey(name);
        if (!key) return;
        positions.set(key, idx + 1);
      });
    }
    const rotation = entry && typeof entry.rotation === "number" ? entry.rotation : 1;
    let setterPos = null;
    for (let pos = 1; pos <= 6; pos += 1) {
      if (String(getRoleLabelForRotation(pos, rotation)).toUpperCase() === "P") {
        setterPos = pos;
        break;
      }
    }
    const subsIn = new Set(substitutionsBySet.get(setNum) || []);
    if (scopeEntry && Array.isArray(scopeEntry.subsIn)) {
      scopeEntry.subsIn.forEach(key => {
        if (!key) return;
        subsIn.add(String(key));
      });
    }
    return { setNum, positions, setterPos, subsIn };
  });
}

export function getAggSkillCounts(skillId, playerIdx) {
  if (!skillId) return emptyCounts();
  const statsSource =
    scoutUiState.analysisStatsCache && scoutUiState.analysisStatsScope === getAnalysisTeamScope()
      ? scoutUiState.analysisStatsCache
      : matchState.state.stats || [];
  if (playerIdx === "team") {
    const totals = emptyCounts();
    Object.values(statsSource || []).forEach(playerStats => {
      const counts = normalizeCounts(playerStats && playerStats[skillId]);
      mergeCounts(totals, counts);
    });
    return totals;
  }
  const idx = typeof playerIdx === "number" ? playerIdx : parseInt(playerIdx, 10);
  if (isNaN(idx) || !statsSource || !statsSource[idx]) return emptyCounts();
  return normalizeCounts(statsSource[idx][skillId]);
}

export function getAggSkillPlayerLabel(playerIdx) {
  if (playerIdx === "team") return "Totale squadra";
  const idx = typeof playerIdx === "number" ? playerIdx : parseInt(playerIdx, 10);
  const scope = getAnalysisTeamScope();
  const players = getPlayersForScope(scope);
  const numbers = getPlayerNumbersForScope(scope);
  if (isNaN(idx) || !players || !players[idx]) return "Giocatrice";
  return scope === "opponent"
    ? formatNameWithNumberFor(players[idx], numbers)
    : formatNameWithNumber(players[idx]);
}
