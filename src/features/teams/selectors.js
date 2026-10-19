import { session as matchState, SKILLS } from '../../../js/globals.js';
export function getEnabledSkills() {
  return SKILLS.filter(skill => {
    const cfg = matchState.state.metricsConfig[skill.id];
    return !cfg || cfg.enabled !== false;
  });
}

export function isSkillEnabled(skillId) {
  if (!skillId) return false;
  const cfg = matchState.state.metricsConfig && matchState.state.metricsConfig[skillId];
  return !cfg || cfg.enabled !== false;
}

export function getTeamScopeFromEvent(ev) {
  return ev && ev.team === "opponent" ? "opponent" : "our";
}

export function getOppositeScope(scope) {
  return scope === "opponent" ? "our" : "opponent";
}

export function isFarSideForScope(scope) {
  const swapped = !!matchState.state.courtSideSwapped;
  return scope === "our" ? swapped : !swapped;
}

export function isServingForScope(scope) {
  return scope === "opponent" ? !matchState.state.isServing : !!matchState.state.isServing;
}

export function getTeamNameForScope(scope) {
  if (scope === "opponent") {
    const matchName = (matchState.state.match && matchState.state.match.opponent) || "";
    return matchName || "Avversaria";
  }
  return (matchState.state.match && matchState.state.match.teamName) || matchState.state.selectedTeam || "Squadra";
}

export function getSelectedTeamNameForScope(scope) {
  if (scope === "opponent") {
    return matchState.state.useOpponentTeam ? (matchState.state.selectedOpponentTeam || "").trim() : "";
  }
  return ((matchState.state.match && matchState.state.match.teamName) || matchState.state.selectedTeam || "").trim();
}

export function getPlayersForScope(scope) {
  return scope === "opponent" ? matchState.state.opponentPlayers || [] : matchState.state.players || [];
}

export function getPlayerNumbersForScope(scope) {
  return scope === "opponent" ? matchState.state.opponentPlayerNumbers || {} : matchState.state.playerNumbers || {};
}

export function getLiberosForScope(scope) {
  return scope === "opponent" ? matchState.state.opponentLiberos || [] : matchState.state.liberos || [];
}

export function getCaptainsForScope(scope) {
  return scope === "opponent" ? matchState.state.opponentCaptains || [] : matchState.state.captains || [];
}

export function getEnabledSkillsForScope(scope) {
  if (scope === "opponent" && matchState.state.useOpponentTeam) {
    const cfg = matchState.state.opponentSkillConfig || {};
    return SKILLS.filter(skill => cfg[skill.id] !== false);
  }
  return getEnabledSkills();
}

export function isSkillEnabledForScope(skillId, scope) {
  if (!skillId) return false;
  if (scope === "opponent" && matchState.state.useOpponentTeam) {
    const cfg = matchState.state.opponentSkillConfig || {};
    return cfg[skillId] !== false;
  }
  return isSkillEnabled(skillId);
}

export function makePlayerKey(scope, playerIdx) {
  return (scope || "our") + ":" + playerIdx;
}

export function isPlayerKeyInScope(key, scope) {
  if (!key || !scope) return false;
  return key.startsWith(scope + ":");
}
