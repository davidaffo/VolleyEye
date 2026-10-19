import { session as matchState } from '../../../js/globals.js';
import { session as analysisFiltersState } from '../state/analysis-analysis-filters.js';
import { session as scoutUiState } from '../state/scout-ui.js';
import { normalizeBaseValue, normalizePhaseValue, normalizeEvalCode, normalizeReceiveZone, normalizeSetNumber, normalizeMatchKey, buildAttackTypeLabel } from './values.js';
import { buildMatchDisplayName, formatUsDate } from '../teams/match-details.js';
import { getSelectedTeamNameForScope, getTeamScopeFromEvent, getTeamNameForScope } from '../teams/selectors.js';
import { normalizePlayerKey } from '../teams/player-identity.js';
import { syncEventPlayerLinks, syncEventPlayerLink, resolvePlayerIdx } from '../events/player-links.js';
import { loadTeamFromStorage, loadOpponentTeamFromStorage, extractRosterFromTeam } from '../teams/storage/team-repository.js';
import { getPointDirectionForScope, getPointDirection, getEventPointValue } from './scores.js';
import { formatPercentValue } from '../../domain/counts.js';
import { normalizeSetTypeValue } from '../../domain/skill-values.js';

export function findEventById(id) {
  if (!matchState.state.events || !Array.isArray(matchState.state.events)) return null;
  return matchState.state.events.find(e => e && e.eventId === id) || null;
}

export function findPreviousEvent(ev) {
  if (!ev) return null;
  if (Array.isArray(ev.relatedEvents)) {
    for (let i = 0; i < ev.relatedEvents.length; i++) {
      const related = findEventById(ev.relatedEvents[i]);
      if (related) return related;
    }
  }
  const idx = matchState.state.events ? matchState.state.events.indexOf(ev) : -1;
  if (idx > 0) return matchState.state.events[idx - 1];
  return null;
}

export function findRelatedSetEvent(ev) {
  if (!ev || !Array.isArray(ev.relatedEvents)) return null;
  for (let i = 0; i < ev.relatedEvents.length; i++) {
    const related = findEventById(ev.relatedEvents[i]);
    if (related && related.skillId === "second") return related;
  }
  return null;
}

export function getSetterFromEvent(ev) {
  if (!ev) return null;
  if (typeof ev.playerIdx === "number" && ev.skillId === "second") return ev.playerIdx;
  if (typeof ev.setterIdx === "number") return ev.setterIdx;
  if (typeof ev.setterId === "number") return ev.setterId;
  const relatedSet = findRelatedSetEvent(ev);
  if (relatedSet && typeof relatedSet.playerIdx === "number") return relatedSet.playerIdx;
  return null;
}

export function getCurrentMatchKey() {
  const selected = (matchState.state.loadedMatchName || matchState.state.selectedMatch || "").trim();
  if (selected) return selected;
  return buildMatchDisplayName(matchState.state.match || {}) || "";
  return "";
}

export function getCurrentMatchLabel() {
  const loaded = (matchState.state.loadedMatchName || matchState.state.selectedMatch || "").trim();
  if (loaded) return loaded;
  return buildMatchDisplayName(matchState.state.match || {}) || "";
  return loaded;
}

export function getMatchTeamNames(payload) {
  if (!payload || !payload.state) return [];
  const match = payload.state.match || {};
  const matchTeam = (match.teamName || "").trim();
  const matchOpponent = (match.opponent || "").trim();
  const selectedTeam = (payload.state.selectedTeam || "").trim();
  const selectedOpponent = (payload.state.selectedOpponentTeam || "").trim();
  const names = [];
  if (matchTeam) {
    names.push(matchTeam);
  } else if (selectedTeam) {
    names.push(selectedTeam);
  }
  if (matchOpponent) {
    names.push(matchOpponent);
  } else if (selectedOpponent) {
    names.push(selectedOpponent);
  }
  return Array.from(new Set(names));
}

export function buildMatchLabelFromPayload(payload) {
  if (!payload || !payload.state) return "";
  const match = payload.state.match || {};
  const dateIso = match.date || "";
  const datePart = dateIso ? formatUsDate(dateIso) : dateIso;
  const teamName = (match.teamName || payload.state.selectedTeam || "").trim();
  const opponent = match.opponent || payload.state.selectedOpponentTeam || "Match";
  const typeLabels = {
    amichevole: "Amichevole",
    campionato: "Campionato",
    torneo: "Torneo",
    playoff: "Playoff",
    playout: "Playout",
    coppa: "Coppa"
  };
  const legLabels = {
    andata: "Andata",
    ritorno: "Ritorno",
    "gara-1": "Gara 1",
    "gara-2": "Gara 2",
    "gara-3": "Gara 3"
  };
  const parts = [
    datePart || "",
    teamName || "Squadra",
    opponent,
    match.category || "",
    typeLabels[match.matchType] || match.matchType || "",
    legLabels[match.leg] || match.leg || ""
  ].filter(Boolean);
  return parts.join(" - ") || "Match";
}

export function getAnalysisExtraMatchState() {
  const raw = matchState.state.uiAnalysisExtraMatchesByScope;
  const ourList = raw && Array.isArray(raw.our) ? raw.our : [];
  const oppList = raw && Array.isArray(raw.opponent) ? raw.opponent : [];
  return { our: new Set(ourList), opponent: new Set(oppList) };
}

export function saveAnalysisExtraMatchState(next) {
  matchState.state.uiAnalysisExtraMatchesByScope = {
    our: Array.from(next.our || []),
    opponent: Array.from(next.opponent || [])
  };
}

export function getAnalysisMatchOptions(scope) {
  const saved = matchState.state.savedMatches || {};
  const currentTeam = getSelectedTeamNameForScope(scope);
  const currentKey = normalizeMatchKey(getCurrentMatchKey());
  const currentLabelKey = normalizeMatchKey(getCurrentMatchLabel());
  if (!currentTeam) return [];
  const currentTeamKey = normalizeMatchKey(currentTeam);
  return Object.entries(saved)
    .filter(([name, payload]) => {
      if (!payload || !payload.state) return false;
      const label = buildMatchLabelFromPayload(payload);
      const labelKey = normalizeMatchKey(label);
      if (normalizeMatchKey(name) === currentKey) return false;
      if (labelKey && labelKey === currentLabelKey) return false;
      const teamNames = getMatchTeamNames(payload).map(team => normalizeMatchKey(team));
      if (teamNames.length === 0) return false;
      return teamNames.includes(currentTeamKey);
    })
    .map(([name, payload]) => {
      const label = buildMatchLabelFromPayload(payload) || name;
      return { value: name, label };
    });
}

export function getAnalysisScopesForExtras() {
  if (!matchState.state.useOpponentTeam) return ["our"];
  if (!analysisFiltersState.analysisTeamFilterState.teams || analysisFiltersState.analysisTeamFilterState.teams.size === 0) {
    return ["our", "opponent"];
  }
  return Array.from(analysisFiltersState.analysisTeamFilterState.teams);
}

export function getAnalysisEvents() {
  const extraStateForKey = getAnalysisExtraMatchState();
  const scopesForKey = getAnalysisScopesForExtras();
  const cacheKey =
    `rev:${scoutUiState.analysisEventsCacheRevision}` +
    `|base:${Array.isArray(matchState.state.events) ? matchState.state.events.length : 0}` +
    `|useOpp:${matchState.state.useOpponentTeam ? 1 : 0}` +
    `|scopes:${(scopesForKey || []).join(",")}` +
    `|our:${Array.from((extraStateForKey && extraStateForKey.our) || []).sort().join(",")}` +
    `|opp:${Array.from((extraStateForKey && extraStateForKey.opponent) || []).sort().join(",")}`;
  if (scoutUiState.analysisEventsCache && scoutUiState.analysisEventsCacheKey === cacheKey) {
    return scoutUiState.analysisEventsCache;
  }
  syncEventPlayerLinks(matchState.state.events || []);
  const baseEvents = Array.isArray(matchState.state.events) ? matchState.state.events : [];
  const extraState = extraStateForKey;
  const extraEvents = [];
  const scopes = scopesForKey;
  scopes.forEach(scope => {
    const matchNames = extraState[scope] || new Set();
    matchNames.forEach(name => {
      const payload = matchState.state.savedMatches && matchState.state.savedMatches[name];
      const events = payload && payload.state && Array.isArray(payload.state.events) ? payload.state.events : [];
      const rosterOur = payload && payload.state && Array.isArray(payload.state.players) ? payload.state.players : [];
      const rosterOpp =
        payload && payload.state && Array.isArray(payload.state.opponentPlayers)
          ? payload.state.opponentPlayers
          : [];
      const resolvePayloadRosterMap = scopeName => {
        if (!payload || !payload.state) return null;
        const teamName =
          scopeName === "opponent"
            ? (payload.state.selectedOpponentTeam || "").trim()
            : (payload.state.selectedTeam || "").trim();
        if (!teamName) return null;
        const mapSource =
          scopeName === "opponent"
            ? payload.state.savedOpponentTeams || payload.state.savedTeams
            : payload.state.savedTeams;
        let team = mapSource && mapSource[teamName] ? mapSource[teamName] : null;
        if (!team) {
          team = loadTeamFromStorage(teamName);
        }
        if (!team && scopeName === "opponent") {
          team = loadOpponentTeamFromStorage(teamName);
        }
        if (!team) return null;
        const roster = extractRosterFromTeam(team);
        const detailed = Array.isArray(roster.playersDetailed) ? roster.playersDetailed : [];
        const nameToId = new Map();
        detailed.forEach(player => {
          const id = player && (player.id || player.playerId);
          const pname = player && player.name;
          if (!id || !pname) return;
          nameToId.set(normalizePlayerKey(pname), id);
        });
        return { nameToId };
      };
      const payloadRosterMaps = {
        our: resolvePayloadRosterMap("our"),
        opponent: resolvePayloadRosterMap("opponent")
      };
      events.forEach(ev => {
        if (!ev) return;
        const cloned = Object.assign({}, ev);
        cloned.analysisMatchKey = name;
        cloned.analysisMatchLabel = buildMatchLabelFromPayload(payload) || name;
        cloned.analysisMatchDate = (payload && payload.state && payload.state.match && payload.state.match.date) || "";
        const evScope = getTeamScopeFromEvent(cloned);
        if (!cloned.playerName && typeof cloned.playerIdx === "number") {
          const roster = evScope === "opponent" ? rosterOpp : rosterOur;
          if (roster && roster[cloned.playerIdx]) {
            cloned.playerName = roster[cloned.playerIdx];
          }
        }
        if (!cloned.playerId && cloned.playerName) {
          const map = payloadRosterMaps[evScope];
          if (map && map.nameToId) {
            cloned.playerId = map.nameToId.get(normalizePlayerKey(cloned.playerName)) || null;
          }
        }
        syncEventPlayerLink(cloned);
        extraEvents.push(cloned);
      });
    });
  });
  scoutUiState.analysisEventsCache = baseEvents.concat(extraEvents);
  scoutUiState.analysisEventsCacheKey = cacheKey;
  return scoutUiState.analysisEventsCache;
}

export function makeScopedIndexKey(scope, idx) {
  return `${scope}:${idx}`;
}

export function matchScopedIndexFilter(selectedSet, scope, idx) {
  if (!selectedSet || selectedSet.size === 0) return true;
  const key = makeScopedIndexKey(scope, idx);
  if (selectedSet.has(key)) return true;
  if (selectedSet.has(idx)) return true;
  if (selectedSet.has(String(idx))) return true;
  return false;
}

export function getTeamFilterOptions() {
  const options = [
    { value: "our", label: getTeamNameForScope("our") }
  ];
  if (matchState.state.useOpponentTeam) {
    options.push({ value: "opponent", label: getTeamNameForScope("opponent") });
  }
  return options;
}

export function getDefaultAnalysisTeamScope() {
  // One-team DVW exports can contain only the visiting roster (e.g. VolleyScout).
  return matchState.state.useOpponentTeam && !(matchState.state.players || []).length && (matchState.state.opponentPlayers || []).length
    ? "opponent" : "our";
}

export function ensureAnalysisTeamFilterDefault() {
  if (analysisFiltersState.analysisTeamFilterState.teams.size !== 0) return;
  const scope = getDefaultAnalysisTeamScope();
  if (!matchState.state.useOpponentTeam || scope === "opponent") analysisFiltersState.analysisTeamFilterState.teams.add(scope);
}

export function matchesTeamFilter(ev, selectedSet) {
  if (!selectedSet || selectedSet.size === 0) return true;
  const scope = getTeamScopeFromEvent(ev);
  return selectedSet.has(scope);
}

export function getAnalysisTeamScope() {
  ensureAnalysisTeamFilterDefault();
  if (analysisFiltersState.analysisTeamFilterState.teams.size === 1) {
    return Array.from(analysisFiltersState.analysisTeamFilterState.teams)[0];
  }
  return "our";
}

export function filterEventsByAnalysisTeam(events) {
  const source = events || getAnalysisEvents();
  return (source || []).filter(ev => matchesTeamFilter(ev, analysisFiltersState.analysisTeamFilterState.teams));
}

export function matchesSummarySetFilter(ev) {
  if (!analysisFiltersState.analysisSummaryFilterState.sets || analysisFiltersState.analysisSummaryFilterState.sets.size === 0) return true;
  const setNum = normalizeSetNumber(ev && ev.set);
  if (setNum === null) return false;
  return analysisFiltersState.analysisSummaryFilterState.sets.has(setNum);
}

export function getPointDirectionFor(scope, ev) {
  if (!ev) return null;
  if (matchState.state.useOpponentTeam) {
    return getPointDirectionForScope(ev, scope);
  }
  return getPointDirection(ev);
}

export function computeRotationDeltasForEvents(events, scope) {
  const rotations = Array.from({ length: 6 }, () => ({ for: 0, against: 0 }));
  (events || []).forEach(ev => {
    const direction = getPointDirectionFor(scope, ev);
    if (!direction) return;
    const rot = ev.rotation && ev.rotation >= 1 && ev.rotation <= 6 ? ev.rotation : 1;
    const val = getEventPointValue(ev);
    const entry = rotations[rot - 1];
    if (direction === "for") {
      entry.for += val;
    } else if (direction === "against") {
      entry.against += val;
    }
  });
  return rotations.map(entry => entry.for - entry.against);
}

export function computeAttackSplitSummary(events) {
  const summary = {
    err: 0,
    mur: 0,
    pt: 0,
    tot: 0
  };
  (events || []).forEach(ev => {
    if (!ev || ev.skillId !== "attack") return;
    summary.tot += 1;
    if (ev.code === "=") summary.err += 1;
    if (ev.code === "/") summary.mur += 1;
    if (ev.code === "#") summary.pt += 1;
  });
  return summary;
}

export function formatPercentValueSafe(num, den) {
  if (!den) return "0%";
  return formatPercentValue(num, den);
}

export function getSummarySetNumbers() {
  const setNums = new Set();
  getAnalysisEvents().forEach(ev => {
    const num = normalizeSetNumber(ev && ev.set);
    if (num) setNums.add(num);
  });
  const played = Array.from(setNums).sort((a, b) => a - b);
  if (!analysisFiltersState.analysisSummaryFilterState.sets || analysisFiltersState.analysisSummaryFilterState.sets.size === 0) return played;
  return played.filter(num => analysisFiltersState.analysisSummaryFilterState.sets.has(num));
}

export function filterNormalEvalOptions(options) {
  return (options || []).filter(opt => scoutUiState.NORMAL_EVAL_CODES.has(opt.value));
}

export function matchesPreviousSkill(ev, filterVal) {
  if (!filterVal || filterVal === "any") return true;
  const normalizedVal = filterVal === "dig-negative" ? "defense-negative" : filterVal;
  const prev = findPreviousEvent(ev);
  const explicitFreeball = !!(ev && ev.fromFreeball);
  const prevFreeball =
    explicitFreeball ||
    (prev && (prev.fromFreeball || prev.actionType === "freeball" || prev.skillId === "freeball"));
  const prevIsReceive = prev && prev.skillId === "pass";
  const prevIsDefense = prev && prev.skillId === "defense";
  const prevReceiveCode = prevIsReceive ? prev.code || prev.receiveEvaluation : null;
  const isPositiveReceive = prevIsReceive && (prevReceiveCode === "#" || prevReceiveCode === "+");
  const isNegativeReceive = prevIsReceive && (prevReceiveCode === "!" || prevReceiveCode === "-");
  // Se non abbiamo receive/freeball esplicita, assumiamo difesa di default
  const fallbackDefense = !prevIsReceive && !prevFreeball;
  switch (normalizedVal) {
    case "freeball-positive":
      return prevFreeball || isPositiveReceive;
    case "receive-positive":
      return !!isPositiveReceive;
    case "defense-negative":
      return isNegativeReceive || prevIsDefense || fallbackDefense;
    case "freeball-only":
      return prevFreeball;
    case "dig-only":
      return prevIsDefense || fallbackDefense;
    default:
      return true;
  }
}

export function matchesAdvancedFilters(ev, filters, { includeSetter = false } = {}) {
  if (!ev || !filters) return true;
  if (includeSetter && filters.setters && filters.setters.size) {
    const setterIdx = getSetterFromEvent(ev);
    if (setterIdx === null || !filters.setters.has(setterIdx)) return false;
  }
  if (filters.setTypes && filters.setTypes.size) {
    const setType = normalizeSetTypeValue(
      ev.setType || (ev.combination && ev.combination.set_type) || (ev.combination && ev.combination.setType)
    );
    if (!setType || !filters.setTypes.has(setType)) return false;
  }
  if (filters.bases && filters.bases.size) {
    const base = normalizeBaseValue(ev.base);
    if (!base || !filters.bases.has(base)) return false;
  }
  if (filters.phases && filters.phases.size) {
    let rawPhase = ev.attackBp;
    if (rawPhase === undefined || rawPhase === null) {
      rawPhase = ev.phase !== undefined ? ev.phase : ev.attackPhase !== undefined ? ev.attackPhase : true; // default BP
    }
    const phase = normalizePhaseValue(rawPhase);
    if (phase === null || !filters.phases.has(phase)) return false;
  }
  if (filters.receiveEvaluations && filters.receiveEvaluations.size) {
    const recvEval = normalizeEvalCode(ev.receiveEvaluation);
    if (!recvEval || !filters.receiveEvaluations.has(recvEval)) return false;
  }
  if (filters.receiveZones && filters.receiveZones.size) {
    const recvZone = normalizeReceiveZone(ev.receivePosition || ev.receiveZone);
    if (recvZone === null || !filters.receiveZones.has(recvZone)) return false;
  }
  if (filters.sets && filters.sets.size) {
    const setNum = normalizeSetNumber(ev.set);
    if (setNum === null || !filters.sets.has(setNum)) return false;
  }
  if (filters.prevSkill && !matchesPreviousSkill(ev, filters.prevSkill)) return false;
  return true;
}

export function matchesVideoFilters(ev, filters) {
  if (!ev || !filters) return true;
  if (filters.teams && filters.teams.size) {
    if (!matchesTeamFilter(ev, filters.teams)) return false;
  }
  if (filters.players && filters.players.size) {
    const idx = resolvePlayerIdx(ev);
    const scope = getTeamScopeFromEvent(ev);
    if (idx === -1 || !matchScopedIndexFilter(filters.players, scope, idx)) return false;
  }
  if (filters.setters && filters.setters.size) {
    const setterIdx = getSetterFromEvent(ev);
    const scope = getTeamScopeFromEvent(ev);
    if (setterIdx === null || !matchScopedIndexFilter(filters.setters, scope, setterIdx)) return false;
  }
  if (filters.skills && filters.skills.size) {
    if (!ev.skillId || !filters.skills.has(ev.skillId)) return false;
  }
  if (filters.codes && filters.codes.size) {
    if (!ev.code || !filters.codes.has(ev.code)) return false;
  }
  if (filters.sets && filters.sets.size) {
    const setNum = normalizeSetNumber(ev.set);
    if (setNum === null || !filters.sets.has(setNum)) return false;
  }
  if (filters.rotations && filters.rotations.size) {
    const rot = Number(ev.rotation);
    if (!Number.isFinite(rot) || !filters.rotations.has(rot)) return false;
  }
  if (filters.zones && filters.zones.size) {
    const zoneVal = Number(ev.zone || ev.playerPosition);
    if (!Number.isFinite(zoneVal) || !filters.zones.has(zoneVal)) return false;
  }
  if (filters.bases && filters.bases.size) {
    const base = normalizeBaseValue(ev.base);
    if (!base || !filters.bases.has(base)) return false;
  }
  if (filters.setTypes && filters.setTypes.size) {
    const setType = normalizeSetTypeValue(
      ev.setType || (ev.combination && ev.combination.set_type) || (ev.combination && ev.combination.setType)
    );
    if (!setType || !filters.setTypes.has(setType)) return false;
  }
  if (filters.phases && filters.phases.size) {
    let rawPhase = ev.attackBp;
    if (rawPhase === undefined || rawPhase === null) {
      rawPhase = ev.phase !== undefined ? ev.phase : ev.attackPhase !== undefined ? ev.attackPhase : true;
    }
    const phase = normalizePhaseValue(rawPhase);
    if (phase === null || !filters.phases.has(phase)) return false;
  }
  if (filters.receiveEvaluations && filters.receiveEvaluations.size) {
    const recvEval = normalizeEvalCode(ev.receiveEvaluation);
    if (!recvEval || !filters.receiveEvaluations.has(recvEval)) return false;
  }
  if (filters.receiveZones && filters.receiveZones.size) {
    const recvZone = normalizeReceiveZone(ev.receivePosition || ev.receiveZone);
    if (recvZone === null || !filters.receiveZones.has(recvZone)) return false;
  }
  if (filters.serveTypes && filters.serveTypes.size) {
    if (!ev.serveType || !filters.serveTypes.has(ev.serveType)) return false;
  }
  if (filters.attackTypes && filters.attackTypes.size) {
    if (ev.skillId !== "attack") return false;
    if (!filters.attackTypes.has(buildAttackTypeLabel(ev.attackType))) return false;
  }
  if (filters.prevSkill && !matchesPreviousSkill(ev, filters.prevSkill)) return false;
  return true;
}

export function getAnalysisCourtSide(value) {
  return value === "far" ? "far" : "near";
}

export function ensureCourtSideState(key) {
  const current = matchState.state[key];
  let next;
  if (current && typeof current === "object") {
    next = Object.assign({ our: "near", opponent: "far" }, current);
  } else if (typeof current === "string") {
    next = { our: getAnalysisCourtSide(current), opponent: "far" };
  } else {
    next = { our: "near", opponent: "far" };
  }
  matchState.state[key] = next;
  return next;
}
