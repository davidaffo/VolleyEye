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
function syncRosterFromSelectedTeamIfNeeded() {
  if (rosterSyncInProgress) return false;
  if (typeof loadTeamFromStorage !== "function" || typeof extractRosterFromTeam !== "function") return false;
  const teamName = (state.selectedTeam || (state.match && state.match.teamName) || "").trim();
  if (!teamName) return false;
  const team = loadTeamFromStorage(teamName);
  if (!team) return false;
  const roster = extractRosterFromTeam(team);
  const rosterPlayers = normalizePlayers(roster.players || []);
  let currentPlayers = normalizePlayers(state.players || []);
  const rosterNumbers =
    typeof normalizeNumbersMap === "function" ? normalizeNumbersMap(roster.numbers || {}) : roster.numbers || {};
  const hasRoster = rosterPlayers.length > 0;
  const missing = hasRoster
    ? rosterPlayers.filter(name => !currentPlayers.some(current => current.toLowerCase() === name.toLowerCase()))
    : [];
  if (!missing.length) return false;
  rosterSyncInProgress = true;
  const mergedPlayers = currentPlayers.concat(missing);
  const mergedNumbers = Object.assign({}, rosterNumbers || {}, state.playerNumbers || {});
  const mergedLiberos = Array.from(
    new Set(
      [
        ...(state.liberos || []),
        ...normalizePlayers(roster.liberos || []).map(name => mapRosterNameToCurrent(name))
      ].filter(name => mergedPlayers.some(player => player.toLowerCase() === name.toLowerCase()))
    )
  );
  const mergedCaptains = (state.captains && state.captains.length ? state.captains : roster.captains) || [];
  const preferred = state.preferredLibero || roster.preferredLibero || "";
  updatePlayersList(mergedPlayers, {
    askReset: false,
    preserveCourt: true,
    playerNumbers: mergedNumbers,
    liberos: mergedLiberos,
    captains: mergedCaptains,
    setDefaultLineup: false,
    preferredLibero: preferred
  });
  rosterSyncInProgress = false;
  return true;
}
function renderPlayers() {
  if (!elPlayersContainer) return;
  syncCourtSideLayout();
  // Il rendering è deliberatamente privo di sincronizzazioni con l'archivio squadre.
  // Il roster del match cambia solo tramite selezione esplicita o modifica rapida.
  if (typeof cleanCourtPlayers === "function" && state.court) {
    const valid = new Set(state.players || []);
    const hasInvalid = state.court.some(slot => slot && slot.main && !valid.has(slot.main));
    if (hasInvalid) {
      cleanCourtPlayers();
    }
  }
  elPlayersContainer.innerHTML = "";
  elPlayersContainer.classList.add("court-layout");
  elPlayersContainer.classList.toggle("court-layout--mirror", !!state.courtViewMirrored);
  ensureCourtShape();
  ensureMetricsConfigDefaults();
  let predictedSkillId = state.useOpponentTeam
    ? getPredictedSkillIdForScope("our")
    : getPredictedSkillId();
  let predictedOpponentSkillId = state.useOpponentTeam ? getPredictedSkillIdForScope("opponent") : null;
  if (state.useOpponentTeam && state.predictiveSkillFlow && !predictedOpponentSkillId) {
    const oppFallbackSeed = isServingForScope("opponent") ? "serve" : "pass";
    if (isSkillEnabledForScope(oppFallbackSeed, "opponent")) {
      predictedOpponentSkillId = oppFallbackSeed;
    } else {
      const enabledOpp = getEnabledSkillsForScope("opponent");
      predictedOpponentSkillId = enabledOpp.length ? enabledOpp[0].id : null;
    }
  }
  if (state.predictiveSkillFlow && !state.useOpponentTeam && !predictedSkillId) {
    const ownEvents = (state.events || []).filter(ev => {
      if (!ev || !ev.skillId) return false;
      if (!ev.team) return true;
      return ev.team !== "opponent";
    });
    const lastOwnFlowEvent = getLastFlowEvent(ownEvents);
    if (!lastOwnFlowEvent) {
      const fallbackSeed = state.isServing ? "serve" : "pass";
      if (isSkillEnabled(fallbackSeed)) {
        predictedSkillId = fallbackSeed;
      } else {
        const enabled = getEnabledSkills();
        predictedSkillId = enabled.length ? enabled[0].id : null;
      }
    }
  }
  const isCompactMobile = !!state.forceMobileLayout || window.matchMedia("(max-width: 900px)").matches;
  const mobileActiveScope = isCompactMobile ? getMobileActiveScope() : null;
  elPlayersContainer.classList.toggle("hidden", mobileActiveScope === "opponent");
  updateSetTypeVisibility(predictedSkillId || predictedOpponentSkillId);
  const hasSelectedServe = isAnySelectedSkill("serve");
  const layoutSkill =
    state.predictiveSkillFlow && predictedSkillId
      ? predictedSkillId
      : isAnySelectedSkill("pass")
        ? "pass"
        : hasSelectedServe
          ? "serve"
          : null;
  const displayCourt = getAutoRoleDisplayCourt(layoutSkill, "our");
  renderTeamCourtCards({
    container: elPlayersContainer,
    scope: "our",
    court: displayCourt.map(item => item.slot || { main: "" }),
    baseCourt: ensureCourtShapeFor(state.court),
    displayCourt,
    numbersMap: state.playerNumbers || {},
    captainSet: new Set((state.captains || []).map(name => name.toLowerCase())),
    libSet: new Set(state.liberos || []),
    allowDrag: true,
    allowReturn: true,
    allowDrop: true,
    isCompactMobile,
    nextSkillId: predictedSkillId
  });
  recalcAllStatsAndUpdateUI();
  renderLineupChips();
  renderOpponentPlayers({ nextSkillId: predictedOpponentSkillId });
  updateNetBlockPrompt();
  renderLogServeTrajectories();
  updateFloatingServeErrorButton(isCompactMobile);
  maybeScrollToActiveCourtOnMobile();
}
function renderOpponentPlayers({ nextSkillId = null, animate = false } = {}) {
  const elOpponentContainer = document.getElementById("opponent-players-container");
  if (!elOpponentContainer) return;
  if (!state.useOpponentTeam) {
    elOpponentContainer.innerHTML = "";
    elOpponentContainer.classList.add("hidden");
    if (typeof updateOpponentRotationDisplay === "function") {
      updateOpponentRotationDisplay();
    }
    return;
  }
  const isCompactMobile = !!state.forceMobileLayout || window.matchMedia("(max-width: 900px)").matches;
  const mobileActiveScope = isCompactMobile ? getMobileActiveScope() : null;
  const hideOpponentCourt = mobileActiveScope === "our";
  elOpponentContainer.classList.toggle("hidden", hideOpponentCourt);
  if (hideOpponentCourt) {
    elOpponentContainer.innerHTML = "";
    return;
  }
  const shouldAnimate = animate && typeof captureRects === "function" && typeof animateFlip === "function";
  const prevRects = shouldAnimate
    ? captureRects('.court-card[data-team-scope="opponent"]', el => {
        const name = el.dataset.playerName || "";
        const pos = el.dataset.posIndex || "";
        return name || "pos-" + pos;
      })
    : null;
  if (typeof ensureOpponentLiberosFromTeam === "function") {
    ensureOpponentLiberosFromTeam();
  }
  syncCourtSideLayout();
  if (typeof updateOpponentRotationDisplay === "function") {
    updateOpponentRotationDisplay();
  }
  elOpponentContainer.innerHTML = "";
  elOpponentContainer.classList.add("court-layout");
  elOpponentContainer.classList.toggle("court-layout--mirror", !!state.opponentCourtViewMirrored);
  const baseOppCourt =
    Array.isArray(state.opponentCourt) && state.opponentCourt.length === 6
      ? state.opponentCourt
      : Array.from({ length: 6 }, (_, idx) => ({ main: (state.opponentPlayers || [])[idx] || "" }));
  const court =
    typeof ensureCourtShapeFor === "function"
      ? ensureCourtShapeFor(baseOppCourt)
      : Array.from({ length: 6 }, (_, idx) => baseOppCourt[idx] || { main: "" });
  let predictedSkillId = state.useOpponentTeam ? nextSkillId || getPredictedSkillIdForScope("opponent") : null;
  if (state.useOpponentTeam && state.predictiveSkillFlow && !predictedSkillId) {
    const fallbackSeed = isServingForScope("opponent") ? "serve" : "pass";
    if (isSkillEnabledForScope(fallbackSeed, "opponent")) {
      predictedSkillId = fallbackSeed;
    } else {
      const enabledOpp = getEnabledSkillsForScope("opponent");
      predictedSkillId = enabledOpp.length ? enabledOpp[0].id : null;
    }
  }
  const layoutSkill =
    state.predictiveSkillFlow && predictedSkillId
      ? predictedSkillId
      : isAnySelectedSkillForScope("opponent", "pass")
        ? "pass"
        : isAnySelectedSkillForScope("opponent", "serve")
          ? "serve"
          : null;
  const displayCourt = getAutoRoleDisplayCourt(layoutSkill, "opponent");
  renderTeamCourtCards({
    container: elOpponentContainer,
    scope: "opponent",
    court: displayCourt.map(item => item.slot || { main: "" }),
    baseCourt: ensureCourtShapeFor(state.opponentCourt || []),
    displayCourt,
    numbersMap: state.opponentPlayerNumbers || {},
    captainSet: new Set((state.opponentCaptains || []).map(name => name.toLowerCase())),
    libSet: new Set(state.opponentLiberos || []),
    allowReturn: true,
    allowDrop: !!state.useOpponentTeam,
    isCompactMobile,
    nextSkillId: predictedSkillId,
    allowSkills: !!state.useOpponentTeam
  });
  if (shouldAnimate) {
    animateFlip(prevRects, '.court-card[data-team-scope="opponent"]', el => {
      const name = el.dataset.playerName || "";
      const pos = el.dataset.posIndex || "";
      return name || "pos-" + pos;
    });
  }
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
