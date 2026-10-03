function updateFloatingServeErrorButton(isCompactMobile) {
  if (!elFloatingServeErrorBtn) return;
  if (!isCompactMobile || !state.useOpponentTeam || !state.predictiveSkillFlow) {
    elFloatingServeErrorBtn.classList.add("hidden");
    return;
  }
  const flowState = getAutoFlowState();
  if (!flowState || flowState.skillId !== "pass") {
    elFloatingServeErrorBtn.classList.add("hidden");
    return;
  }
  const servingScope = getOppositeScope(flowState.teamScope);
  if (!isSkillEnabledForScope("serve", servingScope)) {
    elFloatingServeErrorBtn.classList.add("hidden");
    return;
  }
  const server = getServerPlayerForScope(servingScope);
  if (!server || !server.name) {
    elFloatingServeErrorBtn.classList.add("hidden");
    return;
  }
  elFloatingServeErrorBtn.dataset.scope = servingScope;
  elFloatingServeErrorBtn.dataset.playerIdx = server.idx != null ? String(server.idx) : "";
  elFloatingServeErrorBtn.dataset.playerName = server.name;
  elFloatingServeErrorBtn.classList.remove("hidden");
}
function getScoutCourtSkill(scope) {
  if (scope === "opponent" && !state.useOpponentTeam) return null;
  const predicted = scope === "our" && !state.useOpponentTeam
    ? getPredictedSkillId()
    : getPredictedSkillIdForScope(scope);
  if (predicted || !state.predictiveSkillFlow) return predicted;
  if (!state.useOpponentTeam) {
    const ownEvents = (state.events || []).filter(event => event && event.team !== "opponent");
    if (getLastFlowEvent(ownEvents)) return null;
  }
  const fallback = isServingForScope(scope) ? "serve" : "pass";
  if (isSkillEnabledForScope(fallback, scope)) return fallback;
  const enabled = getEnabledSkillsForScope(scope);
  return enabled.length ? enabled[0].id : null;
}
function renderPlayers() {
  syncAutoLiberoSelects();
  syncCourtSideLayout();
  ensureMetricsConfigDefaults();
  const ourSkill = getScoutCourtSkill("our");
  const opponentSkill = getScoutCourtSkill("opponent");
  updateSetTypeVisibility(ourSkill || opponentSkill);
  renderScoutTeamCourt("our", { nextSkillId: ourSkill });
  renderScoutTeamCourt("opponent", { nextSkillId: opponentSkill });
  updateOpponentRotationDisplay();
  recalcAllStatsAndUpdateUI();
  renderLineupChips();
  updateNetBlockPrompt();
  renderLogServeTrajectories();
  const compact = !!state.forceMobileLayout || window.matchMedia("(max-width: 900px)").matches;
  updateFloatingServeErrorButton(compact);
  maybeScrollToActiveCourtOnMobile();
}
function renderOpponentPlayers(options = {}) {
  syncCourtSideLayout();
  updateOpponentRotationDisplay();
  renderScoutTeamCourt("opponent", options);
}
function renderScoutTeamCourt(scope, { nextSkillId = null, animate = false } = {}) {
  const container = document.getElementById(scope === "opponent" ? "opponent-players-container" : "players-container");
  if (!container) return;
  const compact = !!state.forceMobileLayout || window.matchMedia("(max-width: 900px)").matches;
  const activeScope = compact ? getMobileActiveScope() : null;
  const hidden = (scope === "opponent" && !state.useOpponentTeam) || (activeScope && activeScope !== scope);
  container.classList.toggle("hidden", !!hidden);
  if (hidden) {
    container.innerHTML = "";
    const parent = container.parentElement;
    if (parent) parent.querySelectorAll('.error-pick-bench-host, .point-pick-host').forEach(node => node.remove());
    return;
  }
  const selector = `.court-card[data-team-scope="${scope}"]`;
  const animationKey = element => element.dataset.playerName || "pos-" + (element.dataset.posIndex || "");
  const shouldAnimate = animate && typeof captureRects === "function" && typeof animateFlip === "function";
  const previousRects = shouldAnimate ? captureRects(selector, animationKey) : null;
  const valid = new Set(getPlayersForScope(scope));
  const court = ensureCourtShapeFor(getTeamCourt(scope)).map(slot => ({
    main: valid.has(slot.main) ? slot.main : "",
    replaced: valid.has(slot.replaced) ? slot.replaced : ""
  }));
  // Il renderer legge soltanto il roster del match, senza ricaricare l’archivio.
  if (scope === "opponent") state.opponentCourt = court;
  else state.court = court;
  container.innerHTML = "";
  container.classList.add("court-layout");
  const mirrored = scope === "opponent" ? state.opponentCourtViewMirrored : state.courtViewMirrored;
  container.classList.toggle("court-layout--mirror", !!mirrored);
  const predictedSkill = nextSkillId || getScoutCourtSkill(scope);
  const layoutSkill = state.predictiveSkillFlow && predictedSkill
    ? predictedSkill
    : isAnySelectedSkillForScope(scope, "pass")
      ? "pass"
      : isAnySelectedSkillForScope(scope, "serve") ? "serve" : null;
  const displayCourt = getAutoRoleDisplayCourt(layoutSkill, scope);
  renderTeamCourtCards({
    container,
    scope,
    court: displayCourt.map(item => item.slot || { main: "" }),
    baseCourt: court,
    displayCourt,
    numbersMap: getPlayerNumbersForScope(scope),
    captainSet: new Set(getCaptainsForScope(scope).map(name => name.toLowerCase())),
    libSet: new Set(getLiberosForScope(scope)),
    allowDrag: true,
    allowReturn: true,
    allowDrop: true,
    allowSkills: true,
    isCompactMobile: compact,
    nextSkillId: predictedSkill
  });
  if (shouldAnimate) animateFlip(previousRects, selector, animationKey);
}
function syncCourtSideLayout() {
  const courtArea = document.getElementById("court-area");
  const opponentPanel = document.querySelector('[data-team-panel="opponent"]');
  const homePanel = document.querySelector('[data-team-panel="home"]');
  const swapped = !!state.courtSideSwapped;
  const homeIsFar = swapped;
  const opponentIsFar = !swapped;
  state.courtViewMirrored = homeIsFar;
  state.opponentCourtViewMirrored = opponentIsFar;
  if (courtArea) {
    courtArea.classList.toggle("court-area--swapped", swapped);
  }
  if (opponentPanel) {
    opponentPanel.classList.toggle("team-panel--far", !swapped);
    opponentPanel.classList.toggle("team-panel--near", swapped);
  }
  if (homePanel) {
    homePanel.classList.toggle("team-panel--far", swapped);
    homePanel.classList.toggle("team-panel--near", !swapped);
  }
}
function swapTeamsInMatch() {
  const swapState = (keyA, keyB) => {
    const tmp = state[keyA];
    state[keyA] = state[keyB];
    state[keyB] = tmp;
  };
  swapState("selectedTeam", "selectedOpponentTeam");
  swapState("players", "opponentPlayers");
  swapState("playerNumbers", "opponentPlayerNumbers");
  swapState("liberos", "opponentLiberos");
  swapState("captains", "opponentCaptains");
  swapState("court", "opponentCourt");
  swapState("rotation", "opponentRotation");
  swapState("courtViewMirrored", "opponentCourtViewMirrored");
  swapState("autoRoleP1American", "opponentAutoRoleP1American");
  swapState("attackTrajectoryEnabled", "opponentAttackTrajectoryEnabled");
  swapState("serveTrajectoryEnabled", "opponentServeTrajectoryEnabled");
  swapState("setTypePromptEnabled", "opponentSetTypePromptEnabled");
  swapState("autoLiberoBackline", "opponentAutoLiberoBackline");
  swapState("autoLiberoRole", "opponentAutoLiberoRole");
  swapState("liberoAutoMap", "opponentLiberoAutoMap");
  swapState("preferredLibero", "opponentPreferredLibero");
  swapState("skillFlowOverride", "opponentSkillFlowOverride");

  if (typeof updateAutoRoleBaseCourtCache === "function") {
    updateAutoRoleBaseCourtCache(state.court);
  }
  if (state.useOpponentTeam) {
    state.match.opponent = state.selectedOpponentTeam || "";
    if (typeof applyMatchInfoToUI === "function") {
      applyMatchInfoToUI();
    }
  }
  if (typeof renderTeamsSelect === "function") renderTeamsSelect();
  if (typeof renderOpponentTeamsSelect === "function") renderOpponentTeamsSelect();
  if (typeof renderOpponentPlayersList === "function") renderOpponentPlayersList();
  if (typeof renderOpponentLiberoTags === "function") renderOpponentLiberoTags();
  if (typeof renderLiberoChipsInline === "function") renderLiberoChipsInline();
  if (typeof applyPlayersFromStateToTextarea === "function") applyPlayersFromStateToTextarea();
  if (typeof applyOpponentPlayersFromStateToTextarea === "function") {
    applyOpponentPlayersFromStateToTextarea();
  }
  saveState();
  renderPlayers();
}
