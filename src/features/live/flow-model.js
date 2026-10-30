import { SKILLS, session as matchState } from "../../../js/globals.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { isServingForScope, isPlayerKeyInScope, getPlayersForScope, isSkillEnabledForScope, getTeamScopeFromEvent, getEnabledSkills, isSkillEnabled, getOppositeScope, getEnabledSkillsForScope, makePlayerKey } from "../teams/selectors.js";
import { getRoleLabelForRotation } from "../teams/roles.js";
import { ensureCourtShapeFor, getCourtShape } from "../teams/court-model.js";
import { getPointDirection } from "../analysis/scores.js";
import { getServeDisplayCourt } from "../teams/serve-court.js";

export function getSelectedSkillForScope(scope, playerIdx) {
  const key = makePlayerKey(scope, playerIdx);
  return scoutUiState.selectedSkillPerPlayer.hasOwnProperty(key) ? scoutUiState.selectedSkillPerPlayer[key] : null;
}

export function isAnySelectedSkillForScope(scope, skillId) {
  const prefix = (scope || "our") + ":";
  return Object.keys(scoutUiState.selectedSkillPerPlayer).some(key => {
    if (!key.startsWith(prefix)) return false;
    return scoutUiState.selectedSkillPerPlayer[key] === skillId;
  });
}

export function isSetterPlayerForScope(scope, playerIdx) {
  ;
  const players = getPlayersForScope(scope);
  if (typeof playerIdx !== "number" || !players[playerIdx]) return false;
  const name = players[playerIdx];
  const baseCourt =
    scope === "opponent"
      ? matchState.state.autoRolePositioning && matchState.state.opponentAutoRoleBaseCourt && matchState.state.opponentAutoRoleBaseCourt.length === 6
        ? ensureCourtShapeFor(matchState.state.opponentAutoRoleBaseCourt)
        : ensureCourtShapeFor(matchState.state.opponentCourt)
      : matchState.state.autoRolePositioning && rosterLineupState.autoRoleBaseCourt
        ? ensureCourtShapeFor(rosterLineupState.autoRoleBaseCourt)
        : ensureCourtShapeFor(matchState.state.court);
  const idx = (baseCourt || []).findIndex(
    slot => slot && (slot.main === name || slot.replaced === name)
  );
  if (idx === -1) return false;
  const rotation = scope === "opponent" ? matchState.state.opponentRotation || 1 : matchState.state.rotation || 1;
  return String(getRoleLabelForRotation(idx + 1, rotation)).toUpperCase() === "P";
}

export function getSetterFromCourtForScope(scope) {
  ;
  const court =
    scope === "opponent" ? getCourtShape(matchState.state.opponentCourt || []) : getCourtShape(matchState.state.court);
  const players = getPlayersForScope(scope);
  const rotation = scope === "opponent" ? matchState.state.opponentRotation || 1 : matchState.state.rotation || 1;
  for (let i = 0; i < court.length; i += 1) {
    const role = String(getRoleLabelForRotation(i + 1, rotation)).toUpperCase();
    if (role !== "P") continue;
    const name = court[i] && court[i].main ? court[i].main : "";
    if (!name) continue;
    const idx = Array.isArray(players) ? players.indexOf(name) : -1;
    return { idx: idx >= 0 ? idx : null, name };
  }
  return { idx: null, name: null };
}

export function getSetterFromLastSetEventForScope(scope) {
  if (!isSkillEnabledForScope("second", scope)) return null;
  const last = matchState.state.events && matchState.state.events.length ? matchState.state.events[matchState.state.events.length - 1] : null;
  if (!last || last.skillId !== "second") return null;
  const lastScope = getTeamScopeFromEvent(last);
  if (lastScope !== scope) return null;
  const idx = typeof last.playerIdx === "number" ? last.playerIdx : null;
  const players = getPlayersForScope(scope);
  const name = last.playerName || (idx !== null && players && players[idx]) || null;
  return { idx, name };
}

export function getFreeballStartSkill(scope = "our") {
  const candidates = ["freeball", "second", "attack", "defense", "pass", "serve"];
  for (let i = 0; i < candidates.length; i += 1) {
    if (isSkillEnabledForScope(candidates[i], scope)) return candidates[i];
  }
  return null;
}

export function getPredictedSkillIdSingle() {
  const enabledSkills = getEnabledSkills();
  const flowNext = skillId => {
    switch (skillId) {
      case "serve":
        return "defense";
      case "pass":
      case "freeball":
        return "second";
      case "second":
        return "attack";
      case "attack":
        return "defense";
      case "block":
        return "defense";
      case "defense":
        return "second";
      default:
        return null;
    }
  };
  const resolveEnabledSkill = skillId => {
    const visited = new Set();
    let current = skillId;
    while (current && !visited.has(current)) {
      if (isSkillEnabled(current)) return current;
      visited.add(current);
      current = flowNext(current);
    }
    return null;
  };
  if (matchState.state.skillFlowOverride) return resolveEnabledSkill(matchState.state.skillFlowOverride);
  if (!matchState.state.predictiveSkillFlow) return null;
  if (enabledSkills.length === 0) return null;
  if (matchState.state.freeballPending) return resolveEnabledSkill(getFreeballStartSkill("our"));
  const ownEvents = (matchState.state.events || []).filter(ev => {
    if (!ev || !ev.skillId) return false;
    if (!ev.team) return true;
    return ev.team !== "opponent";
  });
  const last = getLastFlowEvent(ownEvents);
  const possessionServe = !!matchState.state.isServing;
  const fallback = resolveEnabledSkill(possessionServe ? "serve" : "pass");
  if (!last) return fallback;
  if (last.skillId === "serve") {
    if (last.code === "/") {
      return resolveEnabledSkill(getFreeballStartSkill("our")) || fallback;
    }
    const dir = (getPointDirection(last));
    if (dir === "for") return resolveEnabledSkill("serve") || fallback;
    if (dir === "against") return resolveEnabledSkill("pass") || fallback;
    return resolveEnabledSkill(flowNext("serve")) || fallback;
  }
  if (last.skillId === "pass" && (last.code === "/" || last.receiveEvaluation === "/")) {
    return resolveEnabledSkill("defense") || fallback;
  }
  if (last.skillId === "attack" && last.code === "!") {
    return resolveEnabledSkill("second") || fallback;
  }
  if (last.skillId === "defense" && (last.code === "-" || last.code === "/")) {
    return resolveEnabledSkill("defense") || fallback;
  }
  if (last.skillId === "block" && last.code === "-") {
    return resolveEnabledSkill("defense") || fallback;
  }
  const dir = (getPointDirection(last));
  if (dir === "for") return resolveEnabledSkill("serve") || fallback;
  if (dir === "against") return resolveEnabledSkill("pass") || fallback;
  return resolveEnabledSkill(flowNext(last.skillId)) || fallback;
}

export function computeTwoTeamFlowFromEvent(ev) {
  const scope = getTeamScopeFromEvent(ev);
  const other = getOppositeScope(scope);
  if (ev.skillId === "serve" && ev.code === "=") {
    return { teamScope: other, skillId: "serve" };
  }
  const dir = (getPointDirection(ev));
  if (dir === "for" || dir === "against") {
    const scoringScope = dir === "for" ? scope : other;
    return { teamScope: scoringScope, skillId: "serve" };
  }
  if (ev.skillId === "pass" && (ev.code === "/" || ev.receiveEvaluation === "/")) {
    return { teamScope: other, skillId: "second" };
  }
  if (ev.skillId === "defense" && ev.code === "/") {
    return { teamScope: other, skillId: "second" };
  }
  if (ev.skillId === "defense" && ev.code === "-") {
    return { teamScope: other, skillId: "defense" };
  }
  if (ev.skillId === "block" && ev.code === "-") {
    return { teamScope: other, skillId: "defense" };
  }
  switch (ev.skillId) {
    case "serve":
      return { teamScope: other, skillId: "pass" };
    case "pass":
    case "freeball":
      return { teamScope: scope, skillId: "second" };
    case "second":
      return { teamScope: scope, skillId: "attack" };
    case "attack": {
      if (ev.code === "/") {
        return { teamScope: other, skillId: "block" };
      }
      if (ev.code === "!") {
        return { teamScope: scope, skillId: "second" };
      }
      return { teamScope: other, skillId: "defense" };
    }
    case "block":
      if (ev.code === "-") {
        return { teamScope: other, skillId: "defense" };
      }
      return { teamScope: scope, skillId: "defense" };
    case "defense":
      if (ev.code === "-" || ev.code === "/") {
        return { teamScope: other, skillId: "second" };
      }
      return { teamScope: scope, skillId: "second" };
    default:
      return { teamScope: scope, skillId: null };
  }
}

export function getLastFlowEvent(events) {
  const list = Array.isArray(events) ? events : [];
  const skillIds = new Set(SKILLS.map(skill => skill.id));
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const ev = list[i];
    if (!ev) continue;
    if (skillIds.has(ev.skillId)) return ev;
    if (ev.skillId === "manual") {
      const dir = (getPointDirection(ev));
      if (dir) return ev;
    }
  }
  return null;
}

export function getActiveServerName(scope) {
  if (matchState.state.pendingServe && matchState.state.pendingServe.scope === scope) {
    return matchState.state.pendingServe.playerName || null;
  }
  const last = getLastFlowEvent(matchState.state.events || []);
  if (last && last.skillId === "serve" && getTeamScopeFromEvent(last) === scope) {
    return last.playerName || null;
  }
  const server = getServerPlayerForScope(scope);
  return server && server.name ? server.name : null;
}

export function isPostServeLockForScope(scope) {
  if (!matchState.state.useOpponentTeam || !matchState.state.predictiveSkillFlow) return false;
  if (matchState.state.forceSkillActive && matchState.state.forceSkillScope === scope) return false;
  if (matchState.state.pendingServe && matchState.state.pendingServe.scope === scope) return true;
  const last = getLastFlowEvent(matchState.state.events || []);
  if (last && last.skillId === "serve" && getTeamScopeFromEvent(last) === scope) {
    if (last.code === "=") return false;
    return true;
  }
  return false;
}

export function getServeCodeFromPassCode(code) {
  const map = {
    "#": "-",
    "+": "-",
    "!": "!",
    "-": "+",
    "/": "/",
    "=": "#"
  };
  return map[code] || "=";
}

export function getAttackCodeFromBlockCode(code) {
  const map = {
    "#": "/",
    "+": "-",
    "-": "+",
    "=": "#"
  };
  return map[code] || null;
}

export function resolveFlowSkillForScope(scope, skillId) {
  const flowNext = current => {
    switch (current) {
      case "serve":
        return "pass";
      case "pass":
      case "freeball":
        return "second";
      case "second":
        return "attack";
      case "attack":
        return "defense";
      case "block":
        return "defense";
      case "defense":
        return "second";
      default:
        return null;
    }
  };
  const visited = new Set();
  let current = skillId;
  while (current && !visited.has(current)) {
    if (isSkillEnabledForScope(current, scope)) return current;
    visited.add(current);
    current = flowNext(current);
  }
  return null;
}

export function getAutoFlowState() {
  if (!matchState.state.useOpponentTeam || !matchState.state.predictiveSkillFlow) return null;
  if (matchState.state.pendingServe && matchState.state.pendingServe.scope) {
    return {
      teamScope: getOppositeScope(matchState.state.pendingServe.scope),
      skillId: "pass"
    };
  }
  if (matchState.state.forceSkillActive && matchState.state.forceSkillScope === "our" && matchState.state.skillFlowOverride) {
    return {
      teamScope: "our",
      skillId: resolveFlowSkillForScope("our", matchState.state.skillFlowOverride)
    };
  }
  if (matchState.state.forceSkillActive && matchState.state.forceSkillScope === "opponent" && matchState.state.opponentSkillFlowOverride) {
    return {
      teamScope: "opponent",
      skillId: resolveFlowSkillForScope("opponent", matchState.state.opponentSkillFlowOverride)
    };
  }
  const last = getLastFlowEvent(matchState.state.events || []);
  // Senza eventi il servizio scelto a inizio set è l'unica fonte autorevole.
  // flowTeamScope può provenire dal match o dal set precedente.
  let flowScope = matchState.state.isServing ? "our" : "opponent";
  let nextSkill = "serve";
  if (last) {
    const next = computeTwoTeamFlowFromEvent(last);
    flowScope = next.teamScope;
    nextSkill = next.skillId;
  }
  if (matchState.state.freeballPending && matchState.state.freeballPendingScope) {
    flowScope = matchState.state.freeballPendingScope;
    nextSkill = getFreeballStartSkill(flowScope);
  }
  const override = flowScope === "opponent" ? matchState.state.opponentSkillFlowOverride : matchState.state.skillFlowOverride;
  if (override) nextSkill = override;
  const resolved = resolveFlowSkillForScope(flowScope, nextSkill);
  return { teamScope: flowScope, skillId: resolved };
}

export function getMobileActiveScope() {
  if (!matchState.state.useOpponentTeam || !matchState.state.predictiveSkillFlow) return null;
  const flowState = getAutoFlowState();
  return flowState && flowState.teamScope ? flowState.teamScope : null;
}

export function canOverrideServeError(scope, skillId, code, flowState, playerName) {
  if (!flowState || flowState.teamScope === scope) return false;
  if (flowState.skillId !== "pass") return false;
  if (skillId !== "serve" || code !== "=") return false;
  if (!isSkillEnabledForScope("serve", scope)) return false;
  const serverName = getActiveServerName(scope);
  if (!serverName) return false;
  return serverName === playerName;
}

export function getServerPlayerForScope(scope) {
  const players = getPlayersForScope(scope);
  const court = getServeDisplayCourt(scope);
  const slot = court[0] || {};
  const name = slot.main || slot.replaced || "";
  if (!name) return null;
  const idx = players.indexOf(name);
  return { idx: idx >= 0 ? idx : null, name };
}

export function shouldInferServeFromPass(scope, skillId) {
  if (!matchState.state.useOpponentTeam || !matchState.state.predictiveSkillFlow) return false;
  if (skillId !== "pass") return false;
  if (
    matchState.state.pendingServe &&
    matchState.state.pendingServe.scope &&
    getOppositeScope(matchState.state.pendingServe.scope) === scope
  ) {
    return true;
  }
  const last = getLastFlowEvent(matchState.state.events || []);
  const baseNext = last
    ? computeTwoTeamFlowFromEvent(last)
    : { teamScope: matchState.state.isServing ? "our" : "opponent", skillId: "serve" };
  if (baseNext.skillId !== "serve") return false;
  const servingScope = baseNext.teamScope;
  if (getOppositeScope(servingScope) !== scope) return false;
  if (!isSkillEnabledForScope("serve", servingScope)) return false;
  if (!isSkillEnabledForScope("pass", scope)) return false;
  return true;
}

export function shouldSkipBlockConfirm(scope = "our") {
  if (matchState.state.predictiveSkillFlow) return true;
  if (!matchState.state.useOpponentTeam) return false;
  const last = getLastFlowEvent(matchState.state.events || []);
  if (!last || last.skillId !== "attack" || last.code !== "/") return false;
  const expectedScope = getOppositeScope(getTeamScopeFromEvent(last));
  return expectedScope === scope;
}

export function isBlockEligibleForScope(scope = "our") {
  if (!matchState.state.useOpponentTeam || !matchState.state.predictiveSkillFlow) return true;
  const last = getLastFlowEvent(matchState.state.events || []);
  if (!last || last.skillId !== "attack" || last.code !== "/") return false;
  const expectedScope = getOppositeScope(getTeamScopeFromEvent(last));
  return expectedScope === scope;
}

export function getPredictedSkillIdForScope(scope) {
  if (scope === "opponent" && !matchState.state.useOpponentTeam) return null;
  if (!matchState.state.predictiveSkillFlow) return null;
  if (
    matchState.state.pendingServe &&
    matchState.state.pendingServe.scope &&
    getOppositeScope(matchState.state.pendingServe.scope) === scope
  ) {
    return resolveFlowSkillForScope(scope, "pass");
  }
  const enabledSkills = getEnabledSkillsForScope(scope);
  if (enabledSkills.length === 0) return null;
  const flowNext = skillId => {
    switch (skillId) {
      case "serve":
        return "pass";
      case "pass":
      case "freeball":
        return "second";
      case "second":
        return "attack";
      case "attack":
        return "defense";
      case "block":
        return "defense";
      case "defense":
        return "second";
      default:
        return null;
    }
  };
  const resolveEnabledSkill = skillId => {
    const visited = new Set();
    let current = skillId;
    while (current && !visited.has(current)) {
      if (isSkillEnabledForScope(current, scope)) return current;
      visited.add(current);
      current = flowNext(current);
    }
    return null;
  };
  const override =
    scope === "opponent" ? matchState.state.opponentSkillFlowOverride : matchState.state.skillFlowOverride;
  if (matchState.state.forceSkillActive && matchState.state.forceSkillScope === scope && override) {
    return resolveEnabledSkill(override);
  }
  if (matchState.state.freeballPending && matchState.state.freeballPendingScope === scope) {
    return resolveEnabledSkill(getFreeballStartSkill(scope));
  }
  const events = matchState.state.events || [];
  const last = getLastFlowEvent(events);
  let flowScope = matchState.state.flowTeamScope || (matchState.state.isServing ? "our" : "opponent");
  let nextSkill = null;
  if (last) {
    const next = computeTwoTeamFlowFromEvent(last);
    flowScope = next.teamScope;
    nextSkill = next.skillId;
  } else {
    flowScope = matchState.state.isServing ? "our" : "opponent";
    nextSkill = flowScope === "our" ? "serve" : "serve";
  }
  if (flowScope !== scope) return null;
  if (override) nextSkill = override;
  return resolveEnabledSkill(nextSkill) || null;
}

export function getPredictedSkillId() {
  if (!matchState.state.useOpponentTeam) {
    return getPredictedSkillIdSingle();
  }
  return getPredictedSkillIdForScope("our");
}

export function isForcedBlockScope(scope = "our") {
  if (!matchState.state.forceSkillActive || matchState.state.forceSkillScope !== scope) return false;
  const override = scope === "opponent" ? matchState.state.opponentSkillFlowOverride : matchState.state.skillFlowOverride;
  return override === "block";
}

export function shouldShowNetBlockPromptForScope(scope = "our") {
  if (!matchState.state.predictiveSkillFlow) return false;
  if (scope === "opponent" && !matchState.state.useOpponentTeam) return false;
  if (isForcedBlockScope(scope)) return false;
  const predicted =
    scope === "opponent"
      ? getPredictedSkillIdForScope("opponent")
      : matchState.state.useOpponentTeam
        ? getPredictedSkillIdForScope("our")
        : getPredictedSkillIdSingle();
  // In doppia squadra lo slash d'attacco richiede già esplicitamente la
  // valutazione del muro avversario: non va trasformato nel prompt opzionale
  // "Muro" sopra una schermata di difesa.
  if (matchState.state.useOpponentTeam && predicted === "block") return false;
  const canPromptFromFlow = predicted === "block" || predicted === "defense";
  if (!canPromptFromFlow) return false;
  if (!isSkillEnabledForScope("block", scope)) return false;
  return true;
}

export function getNetBlockPromptScope() {
  const our = shouldShowNetBlockPromptForScope("our");
  if (!matchState.state.useOpponentTeam) return our ? "our" : null;
  const opponent = shouldShowNetBlockPromptForScope("opponent");
  if (our && opponent) {
    const flowState = getAutoFlowState();
    return flowState && flowState.teamScope === "opponent" ? "opponent" : "our";
  }
  if (our) return "our";
  if (opponent) return "opponent";
  return null;
}

export function getScoutCourtSkill(scope) {
  if (scope === "opponent" && !matchState.state.useOpponentTeam) return null;
  const predicted = scope === "our" && !matchState.state.useOpponentTeam
    ? getPredictedSkillId()
    : getPredictedSkillIdForScope(scope);
  if (predicted || !matchState.state.predictiveSkillFlow) return predicted;
  if (!matchState.state.useOpponentTeam) {
    const ownEvents = (matchState.state.events || []).filter(event => event && event.team !== "opponent");
    if (getLastFlowEvent(ownEvents)) return null;
  }
  const fallback = isServingForScope(scope) ? "serve" : "pass";
  if (isSkillEnabledForScope(fallback, scope)) return fallback;
  const enabled = getEnabledSkillsForScope(scope);
  return enabled.length ? enabled[0].id : null;
}

export function getAttackMetaForPlayer(scope, playerIdx) {
  const scopedKey = scope + ":" + playerIdx;
  if (scoutUiState.attackMetaByPlayer[scopedKey]) return scoutUiState.attackMetaByPlayer[scopedKey];
  const fallbackKey = makePlayerKey(scope, playerIdx);
  const direct = scoutUiState.attackMetaByPlayer[fallbackKey];
  if (direct && direct.playerIdx === playerIdx && direct.scope === scope) return direct;
  const keys = Object.keys(scoutUiState.attackMetaByPlayer);
  for (let i = 0; i < keys.length; i += 1) {
    const meta = scoutUiState.attackMetaByPlayer[keys[i]];
    if (meta && meta.playerIdx === playerIdx && meta.scope === scope) return meta;
  }
  return null;
}

export function getActiveAttackKeyForScope(scope) {
  if (scoutUiState.attackInlinePlayer && isPlayerKeyInScope(scoutUiState.attackInlinePlayer, scope)) {
    return scoutUiState.attackInlinePlayer;
  }
  const keys = Object.keys(scoutUiState.attackMetaByPlayer);
  for (let i = 0; i < keys.length; i += 1) {
    const meta = scoutUiState.attackMetaByPlayer[keys[i]];
    if (!meta || meta.scope !== scope) continue;
    if (typeof meta.playerIdx !== "number") continue;
    return keys[i];
  }
  return null;
}

export function setSelectedSkillForScope(scope, playerIdx, skillId) {
  const key = makePlayerKey(scope, playerIdx);
  if (skillId) {
    scoutUiState.selectedSkillPerPlayer[key] = skillId;
    if (skillId !== "serve") {
      delete scoutUiState.serveMetaByPlayer[key];
    }
    if (skillId === "block") {
      scoutUiState.blockConfirmByPlayer[key] = false;
      scoutUiState.blockInlinePlayer = key;
    } else {
      delete scoutUiState.blockConfirmByPlayer[key];
      if (scoutUiState.blockInlinePlayer === key) {
        scoutUiState.blockInlinePlayer = null;
      }
    }
  } else {
    delete scoutUiState.selectedSkillPerPlayer[key];
    delete scoutUiState.serveMetaByPlayer[key];
    delete scoutUiState.blockConfirmByPlayer[key];
    if (scoutUiState.blockInlinePlayer === key) {
      scoutUiState.blockInlinePlayer = null;
    }
  }
}
export function resetSetTypeState() {
  Object.keys(scoutUiState.selectedSkillPerPlayer).forEach(key => delete scoutUiState.selectedSkillPerPlayer[key]);
}
