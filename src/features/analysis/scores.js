import { session as matchState } from '../../../js/globals.js';
import { normalizeScoreOverrides, ensurePointRulesDefaults, normalizePointRule } from '../settings/rules.js';
import { getTeamScopeFromEvent } from '../teams/selectors.js';
export function ensureScoreOverrides() {
  const normalized = normalizeScoreOverrides(matchState.state.scoreOverrides || {});
  matchState.state.scoreOverrides = normalized;
  return matchState.state.scoreOverrides;
}

export function getScoreOverrideForSet(setNum) {
  const overrides = ensureScoreOverrides();
  const entry = overrides[setNum] || { for: 0, against: 0 };
  const forVal = Number(entry.for);
  const againstVal = Number(entry.against);
  return {
    for: Number.isFinite(forVal) ? forVal : 0,
    against: Number.isFinite(againstVal) ? againstVal : 0
  };
}

export function getScoreOverrideTotals(targetSet = null) {
  if (targetSet !== null && targetSet !== undefined) {
    const setNum = Math.min(5, Math.max(1, parseInt(targetSet, 10) || 1));
    return getScoreOverrideForSet(setNum);
  }
  const overrides = ensureScoreOverrides();
  return Object.keys(overrides || {}).reduce(
    (acc, key) => {
      const setNum = parseInt(key, 10);
      if (!setNum) return acc;
      const entry = getScoreOverrideForSet(setNum);
      acc.for += entry.for;
      acc.against += entry.against;
      return acc;
    },
    { for: 0, against: 0 }
  );
}

export function getScoreOverrideTotalsForScope(targetSet, scope = "our") {
  const totals = getScoreOverrideTotals(targetSet);
  if (matchState.state.useOpponentTeam && scope === "opponent") {
    return { for: totals.against, against: totals.for };
  }
  return totals;
}

export function getPointDirection(ev) {
  // Imported score markers award each rally once. Direction is stored for home.
  if (ev && ev.dvwScoreAuthoritative) {
    const direction = ev.pointDirection;
    if (direction !== "for" && direction !== "against") return null;
    return getTeamScopeFromEvent(ev) === "opponent"
      ? (direction === "for" ? "against" : "for") : direction;
  }
  if (ev && ev.pendingBlockEval) return null;
  if (ev && (ev.derivedFromPassServe || ev.derivedFromBlock)) return null;
  if (ev && ev.skillId === "manual" && (ev.pointDirection === "for" || ev.pointDirection === "against")) {
    return ev.pointDirection;
  }
  ensurePointRulesDefaults();
  const skill = ev.skillId;
  const code = ev.code;
  const cfg = normalizePointRule(skill, matchState.state.pointRules && matchState.state.pointRules[skill]);
  if (cfg.for.includes(code)) return "for";
  if (cfg.against.includes(code)) return "against";
  return null;
}

export function getPointDirectionForScope(ev, scope) {
  const dir = getPointDirection(ev);
  if (!dir) return null;
  const eventScope = getTeamScopeFromEvent(ev);
  if (eventScope === scope) return dir;
  return dir === "for" ? "against" : "for";
}

export function getEventPointValue(ev) {
  if (!ev || ev.value === undefined || ev.value === null || ev.value === "") return 1;
  const value = Number(ev.value);
  return Number.isFinite(value) ? Math.max(0, value) : 1;
}

export function isOpponentErrorPoint(ev) {
  return !!(ev && ev.skillId === "manual" && ev.code === "opp-error");
}

export function computePointsSummary(targetSet, options = {}) {
  const includeOverrides = options.includeOverrides !== false;
  const excludeOpponentErrors = !!options.excludeOpponentErrors;
  const teamScope = options.teamScope || "our";
  const sourceEvents = Array.isArray(options.events) ? options.events : matchState.state.events || [];
  const target = targetSet ? parseInt(targetSet, 10) : null;
  const rotations = {};
  for (let r = 1; r <= 6; r++) {
    rotations[r] = { for: 0, against: 0 };
  }
  let totalFor = 0;
  let totalAgainst = 0;
  const filteredEvents = sourceEvents.filter(ev => {
    if (target === null) return true;
    return (parseInt(ev && ev.set, 10) || 1) === target;
  });
  filteredEvents.forEach(ev => {
    if (excludeOpponentErrors && isOpponentErrorPoint(ev)) return;
    const direction = matchState.state.useOpponentTeam
      ? getPointDirectionForScope(ev, teamScope)
      : getPointDirection(ev);
    if (!direction) return;
    const value = getEventPointValue(ev);
    const rot = ev.rotation && ev.rotation >= 1 && ev.rotation <= 6 ? ev.rotation : 1;
    if (!rotations[rot]) {
      rotations[rot] = { for: 0, against: 0 };
    }
    if (direction === "for") {
      rotations[rot].for += value;
      totalFor += value;
    } else if (direction === "against") {
      rotations[rot].against += value;
      totalAgainst += value;
    }
  });
  const rotationList = Object.keys(rotations).map(key => {
    const rotNum = parseInt(key, 10);
    const obj = rotations[rotNum] || { for: 0, against: 0 };
    const forVal = Math.max(0, obj.for);
    const againstVal = Math.max(0, obj.against);
    return { rotation: rotNum, for: forVal, against: againstVal, delta: forVal - againstVal };
  });
  const overrideTotals = includeOverrides
    ? getScoreOverrideTotalsForScope(target, teamScope)
    : { for: 0, against: 0 };
  const totalForClean = Math.max(0, totalFor + overrideTotals.for);
  const totalAgainstClean = Math.max(0, totalAgainst + overrideTotals.against);
  const hasRotationEvents = rotationList.some(r => r.for || r.against);
  const hasEvents = hasRotationEvents || overrideTotals.for !== 0 || overrideTotals.against !== 0;
  const maxDelta = rotationList.reduce((acc, r) => Math.max(acc, r.delta), -Infinity);
  const minDelta = rotationList.reduce((acc, r) => Math.min(acc, r.delta), Infinity);
  const best = hasRotationEvents ? rotationList.find(r => r.delta === maxDelta) : null;
  const worst = hasRotationEvents ? rotationList.find(r => r.delta === minDelta) : null;
  return {
    totalFor: totalForClean,
    totalAgainst: totalAgainstClean,
    rotations: rotationList,
    bestRotation: hasRotationEvents && best ? best.rotation : null,
    worstRotation: hasRotationEvents && worst ? worst.rotation : null,
    bestDelta: hasRotationEvents && best ? best.delta : null,
    worstDelta: hasRotationEvents && worst ? worst.delta : null,
    hasRotationEvents,
    overrideFor: overrideTotals.for,
    overrideAgainst: overrideTotals.against
  };
}

export function computeSetScores(teamScope = "our", options = {}) {
  const sourceEvents = Array.isArray(options.events) ? options.events : matchState.state.events || [];
  const setMap = {};
  sourceEvents.forEach(ev => {
    const setNum = parseInt(ev.set, 10) || 1;
    const direction =
      matchState.state.useOpponentTeam ? getPointDirectionForScope(ev, teamScope) : getPointDirection(ev);
    if (!direction) return;
    const value = getEventPointValue(ev);
    if (!setMap[setNum]) {
      setMap[setNum] = { for: 0, against: 0 };
    }
    if (direction === "for") {
      setMap[setNum].for += value;
    } else if (direction === "against") {
      setMap[setNum].against += value;
    }
  });
  const overrideMap = ensureScoreOverrides();
  Object.keys(overrideMap || {}).forEach(key => {
    const setNum = parseInt(key, 10);
    if (!setNum) return;
    const entry = getScoreOverrideTotalsForScope(setNum, teamScope);
    if (!setMap[setNum]) {
      setMap[setNum] = { for: 0, against: 0 };
    }
    setMap[setNum].for += entry.for;
    setMap[setNum].against += entry.against;
  });
  const sets = Object.keys(setMap)
    .map(k => parseInt(k, 10))
    .sort((a, b) => a - b)
    .map(setNum => {
      const entry = setMap[setNum];
      const forVal = Math.max(0, entry.for);
      const againstVal = Math.max(0, entry.against);
      return { set: setNum, for: forVal, against: againstVal, delta: forVal - againstVal };
    });
  const totalFor = sets.reduce((sum, s) => sum + s.for, 0);
  const totalAgainst = sets.reduce((sum, s) => sum + s.against, 0);
  return { sets, totalFor: Math.max(0, totalFor), totalAgainst: Math.max(0, totalAgainst) };
}
