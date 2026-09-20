function applyForceMobileLayout(enabled) {
  document.body.classList.toggle("force-mobile", !!enabled);
  renderPlayers();
  updateCourtModalPlacement();
}

async function initializeApplicationState() {
  isLoadingMatch = true;
  if (typeof window !== "undefined") {
    window.isLoadingMatch = true;
  }
  initCrossTabResetSync();
  initBugReportLink();
  initTabs();
  initSwipeTabs();
  setupFocusGuards();
  resetAttackShortcutModals();
  initSetTypeShortcuts();
  document.addEventListener("keydown", handleVideoShortcut, true);
  document.body.dataset.activeTab = activeTab;
  setActiveAggTab(activeAggTab || "summary");
  const isExportAnalysisHtml =
    typeof window !== "undefined" && !!window.__EXPORT_ANALYSIS_HTML__;
  const resetRequestedByUrl =
    !isExportAnalysisHtml &&
    typeof window !== "undefined" &&
    new URL(window.location.href).searchParams.get("reset_app") === "1";
  const resetJustCompleted =
    !isExportAnalysisHtml &&
    typeof window !== "undefined" &&
    window.sessionStorage &&
    window.sessionStorage.getItem("volleyScoutResetDone") === "1";
  if (resetRequestedByUrl || resetJustCompleted) {
    if (typeof window !== "undefined") {
      window.__appResetInProgress = true;
      window.__recentAppResetAt = Date.now();
      window.__resetWriteLog = [];
    }
    try {
      window.sessionStorage.removeItem("volleyScoutResetDone");
    } catch (_) {
      // ignore
    }
    if ("serviceWorker" in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(reg => reg.unregister()));
      } catch (_) {
        // ignore
      }
    }
    if (typeof clearCachedLocalVideo === "function") {
      try {
        await clearCachedLocalVideo();
      } catch (_) {
        // ignore
      }
    }
    if ("caches" in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      } catch (_) {
        // ignore
      }
    }
    try {
      localStorage.clear();
    } catch (_) {
      // ignore
    }
    if (typeof clearStateSnapshotFromIndexedDb === "function") {
      await clearStateSnapshotFromIndexedDb();
    }
    try {
      if (typeof deleteAllIndexedDbDatabases === "function") {
        await deleteAllIndexedDbDatabases();
      }
    } catch (_) {
      // ignore
    }
    try {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("reset_app");
      if (resetRequestedByUrl) {
        try {
          window.sessionStorage.setItem("volleyScoutResetDone", "1");
        } catch (_) {
          // ignore
        }
        window.location.replace(cleanUrl.toString());
        return;
      }
      window.history.replaceState({}, "", cleanUrl.toString());
    } catch (_) {
      // ignore
    }
    if (typeof window !== "undefined") {
      window.__recentAppResetAt = Date.now();
      window.__appResetInProgress = false;
    }
  }
  let loadedFromIndexedDb = false;
  let loadedFromLocalStorage = false;
  let defaultDemoCreated = false;
  if (isExportAnalysisHtml && typeof window !== "undefined" && window.__exportedAnalysisState) {
    applyStateSnapshot(window.__exportedAnalysisState, { skipStorageSync: true });
  } else if (!isExportAnalysisHtml && !resetRequestedByUrl && !resetJustCompleted && typeof loadStateFromIndexedDb === "function") {
    loadedFromIndexedDb = await loadStateFromIndexedDb();
  }
  if (!isExportAnalysisHtml && !resetRequestedByUrl && !resetJustCompleted && !loadedFromIndexedDb) {
    loadedFromLocalStorage = loadState();
  }
  const hasStoredCollections =
    (typeof listMatchesFromStorage === "function" && listMatchesFromStorage().length > 0) ||
    (typeof listTeamsFromStorage === "function" && listTeamsFromStorage().length > 0);
  const hasMatchLink = typeof readMatchLinkParam === "function" && !!readMatchLinkParam();
  const hasPersistedData = loadedFromIndexedDb || loadedFromLocalStorage || hasStoredCollections || hasMatchLink;
  if (!isExportAnalysisHtml && !hasPersistedData && getDefaultDemoPreference() !== "removed") {
    defaultDemoCreated = await loadDefaultDemoMatch();
  }
  applyVideoLayoutWidths();
  applyScoutColumnLayout();
  if (!isExportAnalysisHtml && typeof syncMatchesFromStorage === "function") {
    syncMatchesFromStorage();
  }
  // La sincronizzazione legge lo storage dei match; ribadisci il demo appena
  // creato per mantenerlo disponibile anche quando lo snapshot è stato scritto
  // prima del primo render.
  if (defaultDemoCreated && typeof getCurrentMatchPayload === "function") {
    state.selectedMatch = DEFAULT_DEMO_MATCH_NAME;
    state.loadedMatchName = DEFAULT_DEMO_MATCH_NAME;
    state.savedMatches = state.savedMatches || {};
    state.savedMatches[DEFAULT_DEMO_MATCH_NAME] = getCurrentMatchPayload(DEFAULT_DEMO_MATCH_NAME);
    if (typeof saveMatchToStorage === "function") {
      saveMatchToStorage(DEFAULT_DEMO_MATCH_NAME, state.savedMatches[DEFAULT_DEMO_MATCH_NAME]);
    }
  }
  state.setResults = state.setResults || {};
  state.setStarts = state.setStarts || {};
  syncMatchSessionUI();
  setActiveTab(state.uiActiveTab || activeTab || "match");
  setActiveAggTab(state.uiAggTab || activeAggTab || "summary");
  ensureBaseRotationDefault();
  const linkImport = maybeImportMatchFromUrl();
  renderYoutubePlayer();
  renderYoutubePlayerScout();
  restoreCachedLocalVideo();
  restoreYoutubeFromState();
  applyTheme(state.theme || "auto");
  applyTopBarVisibility();
  applyMatchInfoToUI();
  updateRotationDisplay();
  applyPlayersFromStateToTextarea();
  applyOpponentPlayersFromStateToTextarea();
  renderPlayersManagerList();
  renderOpponentLiberoTags();
  renderOpponentPlayersList();
  renderBenchChips();
  renderLiberoChipsInline();
  renderLineupChips();
  renderLiberoTags();
  renderMetricsConfig();
  renderTeamsSelect();
  renderOpponentTeamsSelect();
  renderMatchesSelect();
  renderLiveScore();
  renderPlayers();
  initLogServeTrajectoryControls();
  if (elFloatingServeErrorBtn && !elFloatingServeErrorBtn._serveErrorBound) {
    elFloatingServeErrorBtn._serveErrorBound = true;
    elFloatingServeErrorBtn.addEventListener("click", async () => {
      const scope = elFloatingServeErrorBtn.dataset.scope || "";
      const playerIdx = parseInt(elFloatingServeErrorBtn.dataset.playerIdx, 10);
      const playerName = elFloatingServeErrorBtn.dataset.playerName || "";
      if (!scope || Number.isNaN(playerIdx) || !playerName) return;
      const success = await handleEventClick(
        playerIdx,
        "serve",
        "=",
        playerName,
        elFloatingServeErrorBtn,
        { scope }
      );
      if (!success) return;
      clearServeTypeInlineListener();
      setSelectedSkillForScope(scope, playerIdx, null);
      renderPlayers();
    });
  }
  applyForceMobileLayout(!!state.forceMobileLayout);
  updateCourtModalPlacement();
  if (!state.players || state.players.length === 0) {
    applyTemplateTeam({ askReset: false });
  } else {
    if (!state.stats || Object.keys(state.stats).length === 0) {
      initStats();
      recalcAllStatsAndUpdateUI();
    }
    renderPlayers();
    renderEventsLog();
    renderAggregatedTable();
    renderBenchChips();
    renderLiberoChipsInline();
    renderLineupChips();
    renderLiberoTags();
    renderMetricsConfig();
    renderTeamsSelect();
  }
  if (state.autoRolePositioning && typeof applyAutoRolePositioning === "function") {
    applyAutoRolePositioning();
  }
  ensureSkillClock();
  ensureVideoClock();
  updateMatchStatusUI();
  updateTeamCounters();
  setScoutControlsDisabled(!!state.matchFinished);

  return { isExportAnalysisHtml, defaultDemoCreated, linkImport };
}
