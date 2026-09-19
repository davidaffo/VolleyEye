function closeCurrentEdit({ refresh = false } = {}) {
  if (currentEditControl) {
    try {
      currentEditControl.blur();
    } catch (_) {
      // ignore
    }
  }
  if (currentEditCell) {
    currentEditCell.dataset.editing = "false";
    currentEditCell = null;
    currentEditControl = null;
    if (refresh) {
      renderEventsLog({ suppressScroll: true });
      renderVideoAnalysis();
    }
  }
}
function setSelectedSkillForScope(scope, playerIdx, skillId) {
  const key = makePlayerKey(scope, playerIdx);
  if (skillId) {
    selectedSkillPerPlayer[key] = skillId;
    if (skillId !== "serve") {
      delete serveMetaByPlayer[key];
    }
    if (skillId === "block") {
      blockConfirmByPlayer[key] = false;
      blockInlinePlayer = key;
    } else {
      delete blockConfirmByPlayer[key];
      if (blockInlinePlayer === key) {
        blockInlinePlayer = null;
      }
    }
  } else {
    delete selectedSkillPerPlayer[key];
    delete serveMetaByPlayer[key];
    delete blockConfirmByPlayer[key];
    if (blockInlinePlayer === key) {
      blockInlinePlayer = null;
    }
  }
}
function getSelectedSkillForScope(scope, playerIdx) {
  const key = makePlayerKey(scope, playerIdx);
  return selectedSkillPerPlayer.hasOwnProperty(key) ? selectedSkillPerPlayer[key] : null;
}
function isAnySelectedSkillForScope(scope, skillId) {
  const prefix = (scope || "our") + ":";
  return Object.keys(selectedSkillPerPlayer).some(key => {
    if (!key.startsWith(prefix)) return false;
    return selectedSkillPerPlayer[key] === skillId;
  });
}
function setSelectedSkill(playerIdx, skillId) {
  setSelectedSkillForScope("our", playerIdx, skillId);
}
function getSelectedSkill(playerIdx) {
  return getSelectedSkillForScope("our", playerIdx);
}
function isAnySelectedSkill(skillId) {
  return isAnySelectedSkillForScope("our", skillId);
}
function isSetterPlayerForScope(scope, playerIdx) {
  if (typeof getRoleLabelForRotation !== "function") return false;
  const players = getPlayersForScope(scope);
  if (typeof playerIdx !== "number" || !players[playerIdx]) return false;
  const name = players[playerIdx];
  const baseCourt =
    scope === "opponent"
      ? state.autoRolePositioning && state.opponentAutoRoleBaseCourt && state.opponentAutoRoleBaseCourt.length === 6
        ? ensureCourtShapeFor(state.opponentAutoRoleBaseCourt)
        : ensureCourtShapeFor(state.opponentCourt)
      : state.autoRolePositioning && autoRoleBaseCourt
        ? ensureCourtShapeFor(autoRoleBaseCourt)
        : ensureCourtShapeFor(state.court);
  const idx = (baseCourt || []).findIndex(
    slot => slot && (slot.main === name || slot.replaced === name)
  );
  if (idx === -1) return false;
  const rotation = scope === "opponent" ? state.opponentRotation || 1 : state.rotation || 1;
  return String(getRoleLabelForRotation(idx + 1, rotation)).toUpperCase() === "P";
}
function isSetterPlayer(playerIdx) {
  return isSetterPlayerForScope("our", playerIdx);
}
function getSetterFromCourtForScope(scope) {
  if (typeof getRoleLabelForRotation !== "function") return { idx: null, name: null };
  const court =
    scope === "opponent" ? getCourtShape(state.opponentCourt || []) : getCourtShape(state.court);
  const players = getPlayersForScope(scope);
  const rotation = scope === "opponent" ? state.opponentRotation || 1 : state.rotation || 1;
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
function getSetterFromCourt() {
  return getSetterFromCourtForScope("our");
}
function getSetterFromLastSetEventForScope(scope) {
  if (!isSkillEnabledForScope("second", scope)) return null;
  const last = state.events && state.events.length ? state.events[state.events.length - 1] : null;
  if (!last || last.skillId !== "second") return null;
  const lastScope = getTeamScopeFromEvent(last);
  if (lastScope !== scope) return null;
  const idx = typeof last.playerIdx === "number" ? last.playerIdx : null;
  const players = getPlayersForScope(scope);
  const name = last.playerName || (idx !== null && players && players[idx]) || null;
  return { idx, name };
}
function getSetterFromLastSetEvent() {
  return getSetterFromLastSetEventForScope("our");
}
function resetSetTypeState() {
  Object.keys(selectedSkillPerPlayer).forEach(key => delete selectedSkillPerPlayer[key]);
}
function getFreeballStartSkill(scope = "our") {
  const candidates = ["freeball", "second", "attack", "defense", "pass", "serve"];
  for (let i = 0; i < candidates.length; i += 1) {
    if (isSkillEnabledForScope(candidates[i], scope)) return candidates[i];
  }
  return null;
}
function getPredictedSkillIdSingle() {
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
  if (state.skillFlowOverride) return resolveEnabledSkill(state.skillFlowOverride);
  if (!state.predictiveSkillFlow) return null;
  if (enabledSkills.length === 0) return null;
  if (state.freeballPending) return resolveEnabledSkill(getFreeballStartSkill("our"));
  const ownEvents = (state.events || []).filter(ev => {
    if (!ev || !ev.skillId) return false;
    if (!ev.team) return true;
    return ev.team !== "opponent";
  });
  const last = getLastFlowEvent(ownEvents);
  const possessionServe = !!state.isServing;
  const fallback = resolveEnabledSkill(possessionServe ? "serve" : "pass");
  if (!last) return fallback;
  if (last.skillId === "serve") {
    if (last.code === "/") {
      return resolveEnabledSkill(getFreeballStartSkill("our")) || fallback;
    }
    const dir = typeof getPointDirection === "function" ? getPointDirection(last) : null;
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
  const dir = typeof getPointDirection === "function" ? getPointDirection(last) : null;
  if (dir === "for") return resolveEnabledSkill("serve") || fallback;
  if (dir === "against") return resolveEnabledSkill("pass") || fallback;
  return resolveEnabledSkill(flowNext(last.skillId)) || fallback;
}
function computeTwoTeamFlowFromEvent(ev) {
  const scope = getTeamScopeFromEvent(ev);
  const other = getOppositeScope(scope);
  if (ev.skillId === "serve" && ev.code === "=") {
    return { teamScope: other, skillId: "serve" };
  }
  const dir = typeof getPointDirection === "function" ? getPointDirection(ev) : null;
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
function getLastFlowEvent(events) {
  const list = Array.isArray(events) ? events : [];
  const skillIds = new Set(SKILLS.map(skill => skill.id));
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const ev = list[i];
    if (!ev) continue;
    if (skillIds.has(ev.skillId)) return ev;
    if (ev.skillId === "manual") {
      const dir = typeof getPointDirection === "function" ? getPointDirection(ev) : null;
      if (dir) return ev;
    }
  }
  return null;
}
function getActiveServerName(scope) {
  if (state.pendingServe && state.pendingServe.scope === scope) {
    return state.pendingServe.playerName || null;
  }
  const last = getLastFlowEvent(state.events || []);
  if (last && last.skillId === "serve" && getTeamScopeFromEvent(last) === scope) {
    return last.playerName || null;
  }
  const server = getServerPlayerForScope(scope);
  return server && server.name ? server.name : null;
}
function isPostServeLockForScope(scope) {
  if (!state.useOpponentTeam || !state.predictiveSkillFlow) return false;
  if (state.forceSkillActive && state.forceSkillScope === scope) return false;
  if (state.pendingServe && state.pendingServe.scope === scope) return true;
  const last = getLastFlowEvent(state.events || []);
  if (last && last.skillId === "serve" && getTeamScopeFromEvent(last) === scope) {
    if (last.code === "=") return false;
    return true;
  }
  return false;
}
function getServeCodeFromPassCode(code) {
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
function getAttackCodeFromBlockCode(code) {
  const map = {
    "#": "/",
    "+": "-",
    "-": "+",
    "=": "#"
  };
  return map[code] || null;
}
function resolveFlowSkillForScope(scope, skillId) {
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
function getAutoFlowState() {
  if (!state.useOpponentTeam || !state.predictiveSkillFlow) return null;
  if (state.pendingServe && state.pendingServe.scope) {
    return {
      teamScope: getOppositeScope(state.pendingServe.scope),
      skillId: "pass"
    };
  }
  if (state.skillFlowOverride) {
    return {
      teamScope: "our",
      skillId: resolveFlowSkillForScope("our", state.skillFlowOverride)
    };
  }
  if (state.opponentSkillFlowOverride) {
    return {
      teamScope: "opponent",
      skillId: resolveFlowSkillForScope("opponent", state.opponentSkillFlowOverride)
    };
  }
  const last = getLastFlowEvent(state.events || []);
  // Senza eventi il servizio scelto a inizio set è l'unica fonte autorevole.
  // flowTeamScope può provenire dal match o dal set precedente.
  let flowScope = state.isServing ? "our" : "opponent";
  let nextSkill = "serve";
  if (last) {
    const next = computeTwoTeamFlowFromEvent(last);
    flowScope = next.teamScope;
    nextSkill = next.skillId;
  }
  if (state.freeballPending && state.freeballPendingScope) {
    flowScope = state.freeballPendingScope;
    nextSkill = getFreeballStartSkill(flowScope);
  }
  const override = flowScope === "opponent" ? state.opponentSkillFlowOverride : state.skillFlowOverride;
  if (override) nextSkill = override;
  const resolved = resolveFlowSkillForScope(flowScope, nextSkill);
  return { teamScope: flowScope, skillId: resolved };
}
function getMobileActiveScope() {
  if (!state.useOpponentTeam || !state.predictiveSkillFlow) return null;
  const flowState = getAutoFlowState();
  return flowState && flowState.teamScope ? flowState.teamScope : null;
}
function canOverrideServeError(scope, skillId, code, flowState, playerName) {
  if (!flowState || flowState.teamScope === scope) return false;
  if (flowState.skillId !== "pass") return false;
  if (skillId !== "serve" || code !== "=") return false;
  if (!isSkillEnabledForScope("serve", scope)) return false;
  const serverName = getActiveServerName(scope);
  if (!serverName) return false;
  return serverName === playerName;
}
function getServerPlayerForScope(scope) {
  const players = getPlayersForScope(scope);
  const court = getServeDisplayCourt(scope);
  const slot = court[0] || {};
  const name = slot.main || slot.replaced || "";
  if (!name) return null;
  const idx = players.indexOf(name);
  return { idx: idx >= 0 ? idx : null, name };
}
function shouldInferServeFromPass(scope, skillId) {
  if (!state.useOpponentTeam || !state.predictiveSkillFlow) return false;
  if (skillId !== "pass") return false;
  if (
    state.pendingServe &&
    state.pendingServe.scope &&
    getOppositeScope(state.pendingServe.scope) === scope
  ) {
    return true;
  }
  const last = getLastFlowEvent(state.events || []);
  const baseNext = last
    ? computeTwoTeamFlowFromEvent(last)
    : { teamScope: state.isServing ? "our" : "opponent", skillId: "serve" };
  if (baseNext.skillId !== "serve") return false;
  const servingScope = baseNext.teamScope;
  if (getOppositeScope(servingScope) !== scope) return false;
  if (!isSkillEnabledForScope("serve", servingScope)) return false;
  if (!isSkillEnabledForScope("pass", scope)) return false;
  return true;
}
function shouldInferAttackFromBlock(scope, skillId, code) {
  if (!state.useOpponentTeam || !state.predictiveSkillFlow) return false;
  if (skillId !== "block") return false;
  if (!code) return false;
  const last = getLastFlowEvent(state.events || []);
  if (!last || last.skillId !== "attack") return false;
  const attackScope = getOppositeScope(scope);
  if (getTeamScopeFromEvent(last) !== attackScope) return false;
  if (last.code !== "/") return false;
  return true;
}
function updateSkillStatsForEvent(scope, playerIdx, skillId, prevCode, nextCode) {
  if (prevCode === nextCode) return;
  const bucket = scope === "our" ? state.stats : state.opponentStats;
  if (!bucket || typeof playerIdx !== "number") return;
  if (!bucket[playerIdx] || !bucket[playerIdx][skillId]) return;
  if (prevCode && bucket[playerIdx][skillId][prevCode] > 0) {
    bucket[playerIdx][skillId][prevCode] -= 1;
  }
  if (nextCode) {
    bucket[playerIdx][skillId][nextCode] = (bucket[playerIdx][skillId][nextCode] || 0) + 1;
  }
}
function shouldSkipBlockConfirm(scope = "our") {
  if (state.predictiveSkillFlow) return true;
  if (!state.useOpponentTeam) return false;
  const last = getLastFlowEvent(state.events || []);
  if (!last || last.skillId !== "attack" || last.code !== "/") return false;
  const expectedScope = getOppositeScope(getTeamScopeFromEvent(last));
  return expectedScope === scope;
}
function isBlockEligibleForScope(scope = "our") {
  if (!state.useOpponentTeam || !state.predictiveSkillFlow) return true;
  const last = getLastFlowEvent(state.events || []);
  if (!last || last.skillId !== "attack" || last.code !== "/") return false;
  const expectedScope = getOppositeScope(getTeamScopeFromEvent(last));
  return expectedScope === scope;
}
function applyBlockInference(blockEvent, blockScope, blockCode) {
  if (!state.useOpponentTeam || !state.predictiveSkillFlow) return;
  if (!blockEvent || blockEvent.skillId !== "block") return;
  const attackScope = getOppositeScope(blockScope);
  const events = state.events || [];
  let attackEvent = null;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const ev = events[i];
    if (!ev || ev.skillId !== "attack") continue;
    if (getTeamScopeFromEvent(ev) !== attackScope) continue;
    if (ev.pendingBlockEval || ev.code === "/") {
      attackEvent = ev;
      break;
    }
  }
  if (!attackEvent) return null;
  if (blockCode === "/") {
    const prevCode = attackEvent.code;
    attackEvent.code = "";
    attackEvent.pendingBlockEval = false;
    attackEvent.derivedFromBlock = true;
    const attackIdx = resolvePlayerIdx(attackEvent);
    updateSkillStatsForEvent(attackScope, attackIdx, "attack", prevCode, "");
    return attackEvent;
  }
  const prevCode = attackEvent.code;
  const nextCode = getAttackCodeFromBlockCode(blockCode);
  attackEvent.code = nextCode || "";
  attackEvent.pendingBlockEval = false;
  attackEvent.derivedFromBlock = true;
  const attackIdx = resolvePlayerIdx(attackEvent);
  updateSkillStatsForEvent(attackScope, attackIdx, "attack", prevCode, attackEvent.code);
  return attackEvent;
}
function getPredictedSkillIdForScope(scope) {
  if (scope === "opponent" && !state.useOpponentTeam) return null;
  if (!state.predictiveSkillFlow) return null;
  if (
    state.pendingServe &&
    state.pendingServe.scope &&
    getOppositeScope(state.pendingServe.scope) === scope
  ) {
    return resolveFlowSkillForScope(scope, "pass");
  }
  if (scope === "opponent" && state.useOpponentTeam && state.predictiveSkillFlow) {
    const last = getLastFlowEvent(state.events || []);
    if (last && last.skillId === "serve" && getTeamScopeFromEvent(last) === scope && last.code === "=") {
      return resolveFlowSkillForScope(scope, "serve");
    }
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
    scope === "opponent" ? state.opponentSkillFlowOverride : state.skillFlowOverride;
  if (override) return resolveEnabledSkill(override);
  if (state.freeballPending && state.freeballPendingScope === scope) {
    return resolveEnabledSkill(getFreeballStartSkill(scope));
  }
  const events = state.events || [];
  const last = getLastFlowEvent(events);
  let flowScope = state.flowTeamScope || (state.isServing ? "our" : "opponent");
  let nextSkill = null;
  if (last) {
    const next = computeTwoTeamFlowFromEvent(last);
    flowScope = next.teamScope;
    nextSkill = next.skillId;
  } else {
    flowScope = state.isServing ? "our" : "opponent";
    nextSkill = flowScope === "our" ? "serve" : "serve";
  }
  if (flowScope !== scope) return null;
  return resolveEnabledSkill(nextSkill) || null;
}
function getPredictedSkillId() {
  if (!state.useOpponentTeam) {
    return getPredictedSkillIdSingle();
  }
  return getPredictedSkillIdForScope("our");
}
function isForcedBlockScope(scope = "our") {
  if (!state.forceSkillActive || state.forceSkillScope !== scope) return false;
  const override = scope === "opponent" ? state.opponentSkillFlowOverride : state.skillFlowOverride;
  return override === "block";
}
function shouldShowNetBlockPromptForScope(scope = "our") {
  if (!state.predictiveSkillFlow) return false;
  if (scope === "opponent" && !state.useOpponentTeam) return false;
  if (isForcedBlockScope(scope)) return false;
  const predicted =
    scope === "opponent"
      ? getPredictedSkillIdForScope("opponent")
      : state.useOpponentTeam
        ? getPredictedSkillIdForScope("our")
        : getPredictedSkillIdSingle();
  // In doppia squadra lo slash d'attacco richiede già esplicitamente la
  // valutazione del muro avversario: non va trasformato nel prompt opzionale
  // "Muro" sopra una schermata di difesa.
  if (state.useOpponentTeam && predicted === "block") return false;
  const canPromptFromFlow = predicted === "block" || predicted === "defense";
  if (!canPromptFromFlow) return false;
  if (!isSkillEnabledForScope("block", scope)) return false;
  return true;
}
function getNetBlockPromptScope() {
  const our = shouldShowNetBlockPromptForScope("our");
  if (!state.useOpponentTeam) return our ? "our" : null;
  const opponent = shouldShowNetBlockPromptForScope("opponent");
  if (our && opponent) {
    const flowState = getAutoFlowState();
    return flowState && flowState.teamScope === "opponent" ? "opponent" : "our";
  }
  if (our) return "our";
  if (opponent) return "opponent";
  return null;
}
function updateNetBlockPrompt() {
  if (!elBtnNetBlockPrompt || !elNetActionsDefault) return;
  const scope = getNetBlockPromptScope();
  const show = !!scope;
  const netDivider = elBtnNetBlockPrompt.closest(".court-net-divider");
  if (netDivider) {
    netDivider.classList.toggle("block-prompt-active", show);
  }
  elBtnNetBlockPrompt.classList.toggle("hidden", !show);
  elNetActionsDefault.classList.toggle("hidden", show);
  elBtnNetBlockPrompt.dataset.scope = scope || "";
}
function triggerNetBlockPrompt() {
  const scope = (elBtnNetBlockPrompt && elBtnNetBlockPrompt.dataset.scope) || getNetBlockPromptScope();
  if (!scope) return;
  forceNextSkill("block", scope);
}
function updateNextSkillIndicator(skillId) {
  if (!elNextSkillIndicator) return;
  updateSetTypeVisibility(skillId);
  if (!state.predictiveSkillFlow) {
    elNextSkillIndicator.style.display = "none";
    elNextSkillIndicator.textContent = "Prossima skill: —";
    elNextSkillIndicator.classList.remove("active");
    return;
  }
  elNextSkillIndicator.style.display = "";
  let scopeLabel = "";
  let resolvedSkillId = skillId;
  if (state.useOpponentTeam) {
    const ours = getPredictedSkillIdForScope("our");
    const opp = getPredictedSkillIdForScope("opponent");
    if (!resolvedSkillId) resolvedSkillId = ours || opp || null;
    if (opp && !ours) {
      scopeLabel = " (" + getTeamNameForScope("opponent") + ")";
    } else if (ours && !opp) {
      scopeLabel = " (" + getTeamNameForScope("our") + ")";
    }
  }
  const meta = SKILLS.find(s => s.id === resolvedSkillId);
  const label = meta ? meta.label : skillId || "—";
  elNextSkillIndicator.textContent = "Prossima skill: " + (label || "—") + scopeLabel;
  elNextSkillIndicator.classList.toggle("active", !!resolvedSkillId);
}
function updateSetTypeVisibility(nextSkillId = null) {
  if (!elSetTypeShortcuts) return;
  elSetTypeShortcuts.classList.remove("set-type-inline--active");
  elSetTypeShortcuts.style.display = "none";
}
