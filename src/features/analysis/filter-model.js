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
import { getAttackErrorType } from '../../domain/attack-errors.js';
import { getAnalysisRoster } from './analysis-roster.js';
import { matchesFilterSelection, matchesFilterAlternatives, isFilterSelectionActive } from '../../domain/filter-selections.js';

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
    const analysisRoster = getAnalysisRoster(scope);
    const matchNames = extraState[scope] || new Set();
    matchNames.forEach(name => {
      const payload = matchState.state.savedMatches && matchState.state.savedMatches[name];
      const source = analysisRoster.sources.get(name);
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
        cloned.analysisOriginalTeam = evScope;
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
        cloned.analysisOriginalPlayerName = cloned.playerName;
        if (source && evScope === source.sourceScope) {
          const sourceIndex = typeof ev.playerIdx === 'number' ? ev.playerIdx : (evScope === 'opponent' ? rosterOpp : rosterOur).findIndex(player => normalizePlayerKey(player) === normalizePlayerKey(ev.playerName));
          const byId = cloned.playerId ? analysisRoster.ids.get(cloned.playerId) : undefined;
          const index = byId ?? source.mapping[sourceIndex] ?? analysisRoster.names.get(normalizePlayerKey(cloned.playerName));
          cloned.team = scope === 'opponent' ? 'opponent' : 'our';
          cloned.playerIdx = index ?? null;
          if (index != null) cloned.playerName = analysisRoster.players[index];
          if (typeof ev.setterIdx === 'number') cloned.setterIdx = source.mapping[ev.setterIdx] ?? null;
          if (typeof ev.setterId === 'number') cloned.setterId = source.mapping[ev.setterId] ?? null;
        } else if (source) {
          cloned.team = scope === 'our' ? 'opponent' : 'our';
          cloned.playerIdx = null;
          cloned.setterIdx = null;
          if (typeof cloned.setterId === 'number') cloned.setterId = null;
        } else {
          syncEventPlayerLink(cloned);
        }
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
  return matchesFilterAlternatives(selectedSet, idx == null || idx === -1 ? [] : [makeScopedIndexKey(scope, idx), idx, String(idx)]);
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
  const scope = getTeamScopeFromEvent(ev);
  return matchesFilterSelection(selectedSet, scope);
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
  const setNum = normalizeSetNumber(ev && ev.set);
  return matchesFilterSelection(analysisFiltersState.analysisSummaryFilterState.sets, setNum);
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
    // Rotation belongs to the event's team; the opposite team's rotation is
    // recorded separately. Never guess a rotation when that snapshot is absent.
    const rawRotation = getTeamScopeFromEvent(ev) === scope
      ? ev.rotation
      : ev.opponentSetterPosition;
    if (typeof rawRotation !== "number" && typeof rawRotation !== "string") return;
    const rot = Number(rawRotation);
    if (!Number.isInteger(rot) || rot < 1 || rot > 6) return;
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
  return played.filter(num => matchesFilterSelection(analysisFiltersState.analysisSummaryFilterState.sets, num));
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
  if (!matchesFilterSelection(filters.attackErrors, getAttackErrorType(ev))) return false;
  if (includeSetter && isFilterSelectionActive(filters.setters) && !matchesFilterSelection(filters.setters, getSetterFromEvent(ev))) return false;
  const setType = normalizeSetTypeValue(ev.setType || ev.combination?.set_type || ev.combination?.setType);
  if (!matchesFilterSelection(filters.setTypes, setType)) return false;
  if (!matchesFilterSelection(filters.bases, normalizeBaseValue(ev.base))) return false;
  let rawPhase = ev.attackBp;
  if (rawPhase === undefined || rawPhase === null) rawPhase = ev.phase !== undefined ? ev.phase : ev.attackPhase !== undefined ? ev.attackPhase : true;
  if (!matchesFilterSelection(filters.phases, normalizePhaseValue(rawPhase))) return false;
  if (!matchesFilterSelection(filters.receiveEvaluations, normalizeEvalCode(ev.receiveEvaluation))) return false;
  if (!matchesFilterSelection(filters.receiveZones, normalizeReceiveZone(ev.receivePosition || ev.receiveZone))) return false;
  if (!matchesFilterSelection(filters.sets, normalizeSetNumber(ev.set))) return false;
  if (filters.prevSkill && !matchesPreviousSkill(ev, filters.prevSkill)) return false;
  return true;
}

export function matchesVideoFilters(ev, filters) {
  if (!ev || !filters) return true;
  if (!matchesFilterSelection(filters.attackErrors, getAttackErrorType(ev))) return false;
  if (!matchesTeamFilter(ev, filters.teams)) return false;
  const scope = getTeamScopeFromEvent(ev);
  if (isFilterSelectionActive(filters.players) && !matchScopedIndexFilter(filters.players, scope, resolvePlayerIdx(ev))) return false;
  if (isFilterSelectionActive(filters.setters) && !matchScopedIndexFilter(filters.setters, scope, getSetterFromEvent(ev))) return false;
  if (!matchesFilterSelection(filters.skills, ev.skillId)) return false;
  if (!matchesFilterSelection(filters.codes, ev.code)) return false;
  if (!matchesFilterSelection(filters.sets, normalizeSetNumber(ev.set))) return false;
  const rotation = ev.rotation == null || ev.rotation === '' ? null : Number(ev.rotation);
  if (!matchesFilterSelection(filters.rotations, Number.isFinite(rotation) ? rotation : null)) return false;
  const rawZone = ev.zone || ev.playerPosition;
  const zone = rawZone == null || rawZone === '' ? null : Number(rawZone);
  if (!matchesFilterSelection(filters.zones, Number.isFinite(zone) ? zone : null)) return false;
  if (!matchesFilterSelection(filters.bases, normalizeBaseValue(ev.base))) return false;
  const setType = normalizeSetTypeValue(ev.setType || ev.combination?.set_type || ev.combination?.setType);
  if (!matchesFilterSelection(filters.setTypes, setType)) return false;
  let rawPhase = ev.attackBp;
  if (rawPhase === undefined || rawPhase === null) rawPhase = ev.phase !== undefined ? ev.phase : ev.attackPhase !== undefined ? ev.attackPhase : true;
  if (!matchesFilterSelection(filters.phases, normalizePhaseValue(rawPhase))) return false;
  if (!matchesFilterSelection(filters.receiveEvaluations, normalizeEvalCode(ev.receiveEvaluation))) return false;
  if (!matchesFilterSelection(filters.receiveZones, normalizeReceiveZone(ev.receivePosition || ev.receiveZone))) return false;
  if (!matchesFilterSelection(filters.serveTypes, ev.serveType)) return false;
  const attackType = ev.skillId === 'attack' ? buildAttackTypeLabel(ev.attackType) : null;
  if (!matchesFilterSelection(filters.attackTypes, attackType)) return false;
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
