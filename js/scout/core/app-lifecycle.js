function resetMatch() {
  if (!confirm("Sei sicuro di voler resettare tutti i dati del match?")) return;
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.unregister());
    });
  }
  if ("caches" in window) {
    caches.keys().then(keys => {
      keys.forEach(key => caches.delete(key));
    });
  }
  resetSetTypeState();
  const stripReplaced = court =>
    (court || []).map(slot => ({
      main: typeof slot === "string" ? slot : (slot && slot.main) || "",
      replaced: ""
    }));
  const preservedCourt = state.court ? stripReplaced(state.court) : Array.from({ length: 6 }, () => ({ main: "" }));
  const preservedRotation = state.rotation || 1;
  const preservedServing = !!state.isServing;
  const preservedAutoRoleCourt = Array.isArray(state.autoRoleBaseCourt)
    ? stripReplaced(state.autoRoleBaseCourt)
    : [];
  const preservedPreferredLibero = state.preferredLibero || "";
  state.events = [];
  state.court = preservedCourt;
  state.rotation = preservedRotation;
  state.autoRoleBaseCourt = preservedAutoRoleCourt;
  autoRoleBaseCourt = preservedAutoRoleCourt.length ? [...preservedAutoRoleCourt] : autoRoleBaseCourt;
  state.currentSet = 1;
  state.setResults = {};
  state.setStarts = {};
  state.scoreOverrides = {};
  state.matchFinished = false;
  state.autoRotatePending = false;
  state.opponentAutoRotatePending = false;
  state.skillFlowOverride = null;
  state.opponentSkillFlowOverride = null;
  state.freeballPending = false;
  state.freeballPendingScope = "our";
  state.flowTeamScope = "our";
  state.matchEndSetSnapshot = null;
  state.matchEndSetRecorded = null;
  Object.keys(selectedSkillPerPlayer).forEach(key => delete selectedSkillPerPlayer[key]);
  state.isServing = preservedServing;
  state.liberoAutoMap = {};
  state.preferredLibero = preservedPreferredLibero;
  if (typeof enforceAutoLiberoForState === "function") {
    enforceAutoLiberoForState({ skipServerOnServe: true });
  }
  state.skillClock = { paused: true, pausedAtMs: null, pausedAccumMs: 0, lastEffectiveMs: 0 };
  state.video = {
    offsetSeconds: 0,
    fileName: "",
    youtubeId: "",
    youtubeUrl: "",
    lastPlaybackSeconds: 0
  };
  state.videoFilterPresets = [];
  state.videoClock = {
    paused: true,
    pausedAtMs: null,
    pausedAccumMs: 0,
    startMs: Date.now(),
    currentSeconds: 0
  };
  clearEventSelection({ clearContexts: true });
  syncYoutubeUrlInputs("");
  clearCachedLocalVideo();
  if (ytPlayer && ytPlayer.stopVideo) {
    ytPlayer.stopVideo();
  }
  if (ytPlayerScout && ytPlayerScout.stopVideo) {
    ytPlayerScout.stopVideo();
  }
  if (elAnalysisVideo) {
    elAnalysisVideo.pause();
    elAnalysisVideo.currentTime = 0;
  }
  if (elAnalysisVideoScout) {
    elAnalysisVideoScout.pause();
    elAnalysisVideoScout.currentTime = 0;
  }
  if (elYoutubeFrame) {
    elYoutubeFrame.src = "";
    elYoutubeFrame.style.display = "none";
  }
  if (elYoutubeFrameScout) {
    elYoutubeFrameScout.src = "";
    elYoutubeFrameScout.style.display = "none";
  }
  syncCurrentSetUI(1);
  initStats();
  saveState();
  recalcAllStatsAndUpdateUI();
  renderEventsLog();
  renderPlayers();
  renderBenchChips();
  updateRotationDisplay();
}
function deleteIndexedDbByName(name) {
  if (!name || !("indexedDB" in window)) return Promise.resolve(false);
  return new Promise(resolve => {
    try {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
      request.onblocked = () => resolve(false);
    } catch (_) {
      resolve(false);
    }
  });
}
async function deleteAllIndexedDbDatabases() {
  if (!("indexedDB" in window)) return;
  const targets = new Set();
  if (typeof STATE_DB_NAME !== "undefined" && STATE_DB_NAME) {
    targets.add(STATE_DB_NAME);
  }
  if (typeof LOCAL_VIDEO_DB !== "undefined" && LOCAL_VIDEO_DB) {
    targets.add(LOCAL_VIDEO_DB);
  }
  if (typeof indexedDB.databases === "function") {
    try {
      const dbs = await indexedDB.databases();
      (dbs || []).forEach(entry => {
        if (entry && entry.name) targets.add(entry.name);
      });
    } catch (_) {
      // ignore
    }
  }
  await Promise.all(Array.from(targets).map(name => deleteIndexedDbByName(name)));
}
async function clearStateSnapshotFromIndexedDb() {
  if (typeof getStateDb !== "function") return;
  try {
    const db = await getStateDb();
    if (!db) return;
    await new Promise(resolve => {
      try {
        const tx = db.transaction(STATE_DB_STORE, "readwrite");
        tx.objectStore(STATE_DB_STORE).delete(STORAGE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch (_) {
        resolve();
      }
    });
    db.close();
    if (typeof stateDbPromise !== "undefined") {
      stateDbPromise = null;
    }
  } catch (_) {
    // ignore
  }
}
async function resetAppData() {
  const ok = confirm(
    "Questa operazione elimina tutti i dati dell'app (squadre, match, impostazioni, video). Procedere?"
  );
  if (!ok) return;
  const signalId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  if (typeof window !== "undefined") {
    window.__appResetInProgress = true;
    window.__recentAppResetAt = Date.now();
  }
  broadcastResetSignal(signalId);
  navigateToResetBootstrap();
}
async function forceRefreshAppAssets() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(reg => reg.unregister()));
    }
  } catch (_) {
    // ignore
  }
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
  } catch (_) {
    // ignore
  }
  try {
    sessionStorage.removeItem("sw-refresh-requested");
  } catch (_) {
    // ignore
  }
  const bust = "refresh=" + Date.now();
  const url = new URL(window.location.href);
  url.searchParams.set("_", bust);
  window.location.replace(url.toString());
}
function undoLastEvent() {
  if (!state.events || state.events.length === 0) {
    alert("Non ci sono eventi da annullare.");
    return;
  }
  const ev = state.events.pop();
  if (!ev) {
    saveState();
    recalcAllStatsAndUpdateUI();
    renderEventsLog();
    renderPlayers();
    renderBenchChips();
    renderLiberoChipsInline();
    renderLineupChips();
    updateRotationDisplay();
    return;
  }
  if (ev.actionType === "set-change" || ev.actionType === "match-end") {
    const prevSet = ev.prevSet || 1;
    const prevFinished = !!ev.prevMatchFinished;
    if (ev.prevSetResults) {
      state.setResults = ev.prevSetResults;
    }
    if (ev.prevSetStarts) {
      state.setStarts = ev.prevSetStarts;
    }
    state.matchFinished = prevFinished;
    restoreSkillClock(ev.prevClock || null);
    restoreVideoClock(ev.prevVideoClock || null);
    setCurrentSet(prevSet, { save: false });
    updateMatchStatusUI();
    setScoutControlsDisabled(!!state.matchFinished);
    saveState();
    recalcAllStatsAndUpdateUI();
    renderEventsLog();
    renderPlayers();
    renderBenchChips();
    renderLiberoChipsInline();
    renderLineupChips();
    updateRotationDisplay();
    updateSetScoreDisplays();
    return;
  }
  if (ev && ev.autoRotationDirection) {
    const reverseDir = ev.autoRotationDirection === "ccw" ? "cw" : "ccw";
    const scope = ev.autoRotationScope || "our";
    if (scope === "opponent") {
      if (typeof rotateOpponentCourt === "function") {
        rotateOpponentCourt(reverseDir);
      }
    } else if (typeof rotateCourt === "function") {
      rotateCourt(reverseDir);
    }
  }
  if (ev && ev.actionType === "substitution") {
    undoSubstitutionEvent(ev);
  }
  const idx = ev.playerIdx;
  const skillId = ev.skillId;
  if (
    state.stats[idx] &&
    state.stats[idx][skillId] &&
    state.stats[idx][skillId][ev.code] > 0
  ) {
    state.stats[idx][skillId][ev.code]--;
  }
  if (state.predictiveSkillFlow) {
    if (typeof resetSetTypeState === "function") {
      resetSetTypeState();
    } else {
      Object.keys(selectedSkillPerPlayer || {}).forEach(key => delete selectedSkillPerPlayer[key]);
    }
    const lastFlow = getLastFlowEvent(state.events || []);
    if (state.useOpponentTeam) {
      if (lastFlow) {
        const next = computeTwoTeamFlowFromEvent(lastFlow);
        state.flowTeamScope = next.teamScope || state.flowTeamScope || (state.isServing ? "our" : "opponent");
      } else {
        state.flowTeamScope = state.isServing ? "our" : "opponent";
      }
    } else {
      state.flowTeamScope = "our";
    }
  }
  recomputeServeFlagsFromHistory({ skipAutoLibero: true });
  saveState();
  recalcAllStatsAndUpdateUI();
  renderEventsLog();
  renderPlayers();
  renderBenchChips();
  renderLiberoChipsInline();
  renderLineupChips();
  updateRotationDisplay();
}
function deleteEventByKey(eventKey) {
  if (!eventKey) return;
  const evIndex = (state.events || []).findIndex((ev, idx) => getEventKey(ev, idx) === eventKey);
  if (evIndex === -1) return;
  const ev = state.events[evIndex];
  const isStructuralEvent =
    ev && ["substitution", "set-change", "match-end"].includes(ev.actionType);
  if (isStructuralEvent && evIndex !== state.events.length - 1) {
    alert(
      "Non puoi eliminare un cambio o un passaggio di set nel mezzo dello storico: il campo successivo diventerebbe incoerente. Annulla prima le azioni più recenti."
    );
    return;
  }
  const label = ev
    ? (() => {
        const scope = getTeamScopeFromEvent(ev);
        const numbers = getPlayerNumbersForScope(scope);
        const nameLabel = ev.playerName ? formatNameWithNumberFor(ev.playerName, numbers) : "";
        return `${nameLabel} ${ev.skillId || ""} ${ev.code || ""}`.trim();
      })()
    : "questa skill";
  if (!confirm(`Eliminare ${label}?`)) return;
  if (isStructuralEvent) {
    undoLastEvent();
    clearEventSelection();
    renderTrajectoryAnalysis();
    renderServeTrajectoryAnalysis();
    return;
  }
  state.events.splice(evIndex, 1);
  clearEventSelection();
  recomputeServeFlagsFromHistory({ skipAutoLibero: true });
  saveState();
  recalcAllStatsAndUpdateUI();
  renderEventsLog();
  renderPlayers();
  renderBenchChips();
  renderLiberoChipsInline();
  renderLineupChips();
  updateRotationDisplay();
  renderTrajectoryAnalysis();
  renderServeTrajectoryAnalysis();
}
function undoSubstitutionEvent(ev) {
  if (!ev) return false;
  const playerIn = (ev.playerIn || "").trim();
  const playerOut = (ev.playerOut || "").trim();
  if (!playerIn || !playerOut) return false;
  const scope = getTeamScopeFromEvent(ev);
  if (
    typeof isLiberoForScope === "function" &&
    (isLiberoForScope(playerIn, scope) || isLiberoForScope(playerOut, scope))
  ) {
    return false;
  }
  const baseCourt = getCourtShape(scope === "opponent" ? state.opponentCourt : state.court);
  const inIdx = baseCourt.findIndex(slot => slot && slot.main === playerIn);
  if (inIdx === -1) return false;
  const outIdx = baseCourt.findIndex(slot => slot && slot.main === playerOut);
  const nextCourt = cloneCourt(baseCourt);
  if (outIdx !== -1 && outIdx !== inIdx) {
    nextCourt[inIdx].main = playerOut;
    nextCourt[outIdx].main = playerIn;
  } else {
    nextCourt[inIdx].main = playerOut;
  }
  if (scope === "opponent" && typeof commitCourtChangeForScope === "function") {
    commitCourtChangeForScope(nextCourt, "opponent");
  } else if (typeof commitCourtChange === "function") {
    commitCourtChange(nextCourt, { clean: true });
  } else {
    if (scope === "opponent") {
      state.opponentCourt = ensureCourtShapeFor(nextCourt);
    } else {
      state.court = ensureCourtShapeFor(nextCourt);
    }
    saveState();
    if (typeof renderPlayers === "function") renderPlayers();
    if (typeof renderBenchChips === "function") renderBenchChips();
    if (typeof renderLineupChips === "function") renderLineupChips();
    if (typeof updateRotationDisplay === "function") updateRotationDisplay();
  }
  return true;
}
function applyAggColumnsVisibility() {
  ensureMetricsConfigDefaults();
  Object.keys(SKILL_COLUMN_MAP).forEach(skillId => {
    const cfg = state.metricsConfig[skillId];
    const enabled = !cfg || cfg.enabled !== false;
    const selector = ".skill-col.skill-" + skillId;
    const nodes = document.querySelectorAll(selector);
    nodes.forEach(node => {
      if (enabled) {
        node.classList.remove("skill-hidden");
      } else {
        node.classList.add("skill-hidden");
      }
    });
  });
}
function registerServiceWorker() {
  if (typeof location !== "undefined" && location.protocol === "file:") {
    return;
  }
  const supportsSw = "serviceWorker" in navigator;
  const secureContext =
    window.isSecureContext || location.protocol === "https:" || location.hostname === "localhost";
  const isLocalDevHost =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname === "::1";
  const appVersionMeta =
    typeof window !== "undefined" && window.__APP_VERSION__ ? window.__APP_VERSION__ : null;
  const currentVersion = appVersionMeta && appVersionMeta.version ? appVersionMeta.version : "";
  const versionLabel = document.getElementById("app-version-label");
  if (versionLabel && currentVersion) {
    versionLabel.textContent = currentVersion;
  }
  const banner = document.getElementById("update-banner");
  const bannerText = banner ? banner.querySelector(".update-banner-text") : null;
  const bannerRefresh = document.getElementById("update-banner-refresh");
  const bannerDismiss = document.getElementById("update-banner-dismiss");
  let waitingWorker = null;
  const reloadWithCacheBust = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("_", "refresh=" + Date.now());
    window.location.replace(url.toString());
  };
  const setBannerMessage = msg => {
    if (!bannerText) return;
    bannerText.textContent = msg || "Aggiornamento disponibile.";
  };
  const showBanner = () => {
    if (!banner) return;
    banner.classList.remove("hidden");
    requestAnimationFrame(() => {
      const height = banner.getBoundingClientRect().height || 0;
      document.documentElement.style.setProperty("--update-banner-offset", `${height}px`);
    });
  };
  const hideBanner = () => {
    if (!banner) return;
    banner.classList.add("hidden");
    document.documentElement.style.setProperty("--update-banner-offset", "0px");
  };
  if (bannerRefresh && !bannerRefresh._swBound) {
    bannerRefresh.addEventListener("click", () => {
      if (!waitingWorker) {
        reloadWithCacheBust();
        return;
      }
      sessionStorage.setItem("sw-refresh-requested", "1");
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    });
    bannerRefresh._swBound = true;
  }
  if (bannerDismiss && !bannerDismiss._swBound) {
    bannerDismiss.addEventListener("click", hideBanner);
    bannerDismiss._swBound = true;
  }
  const checkRemoteVersion = async () => {
    if (!currentVersion) return;
    try {
      const response = await fetch("version.json", { cache: "no-store" });
      if (!response.ok) return;
      const remote = await response.json();
      const nextVersion = remote && remote.version ? String(remote.version) : "";
      if (nextVersion && nextVersion !== currentVersion) {
        setBannerMessage(`Aggiornamento disponibile (${currentVersion} -> ${nextVersion}).`);
        showBanner();
      }
    } catch (_) {
      // ignore version check errors
    }
  };
  if (isLocalDevHost) {
    // In local development the SW frequently serves stale assets while debugging.
    // Force-disable it so localhost always uses files directly from the dev server.
    if (supportsSw) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => reg.unregister());
      }).catch(() => {});
    }
    if ("caches" in window) {
      caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).catch(() => {});
    }
    checkRemoteVersion();
    return;
  }
  if (!supportsSw || !secureContext) {
    checkRemoteVersion();
    return;
  }
  window.addEventListener("load", () => {
    const swUrl = `service-worker.js?v=${encodeURIComponent(
      (appVersionMeta && appVersionMeta.cacheVersion) || window.__APP_CACHE_VERSION__ || "dev"
    )}`;
    navigator.serviceWorker
      .register(swUrl, { updateViaCache: "none" })
      .then(reg => {
        if (reg && typeof reg.update === "function") {
          reg.update();
        }
        if (navigator.serviceWorker.controller) {
          sessionStorage.removeItem("sw-refresh-requested");
        }
        if (reg.waiting) {
          waitingWorker = reg.waiting;
          setBannerMessage("Aggiornamento disponibile.");
          showBanner();
        }
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              waitingWorker = reg.waiting;
              setBannerMessage("Aggiornamento disponibile.");
              showBanner();
            }
          });
        });
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (sessionStorage.getItem("sw-refresh-requested") !== "1") return;
          sessionStorage.removeItem("sw-refresh-requested");
          reloadWithCacheBust();
        });
        checkRemoteVersion();
      })
      .catch(err => console.error("SW registration failed", err));
  });
}
function setActiveAggTab(target) {
  const desired = target || "summary";
  activeAggTab = desired;
  state.uiAggTab = desired;
  if (!isLoadingMatch) saveState();
  if (document && document.body) {
    document.body.dataset.aggTab = desired;
  }
  if (elAggTabButtons && typeof elAggTabButtons.forEach === "function") {
    elAggTabButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.aggTabTarget === desired);
    });
  }
  if (elAggSubPanels && typeof elAggSubPanels.forEach === "function") {
    elAggSubPanels.forEach(panel => {
      panel.classList.toggle("active", panel.dataset.aggTab === desired);
    });
  }
  if (elAnalysisScoreSummary) {
    elAnalysisScoreSummary.classList.toggle("hidden", desired !== "summary");
  }
  if (desired === "trajectory") {
    const refresh = () => {
      if (typeof renderTrajectoryAnalysis === "function") {
        renderTrajectoryAnalysis();
      }
      if (typeof renderServeTrajectoryAnalysis === "function") {
        renderServeTrajectoryAnalysis();
      }
    };
    requestAnimationFrame(refresh);
    setTimeout(refresh, 0);
  }
  if (desired === "serve") {
    const refreshServe = () => {
      if (typeof renderServeTrajectoryAnalysis === "function") {
        renderServeTrajectoryAnalysis();
      }
    };
    requestAnimationFrame(refreshServe);
    setTimeout(refreshServe, 0);
  }
  if (desired === "player") {
    const refreshPlayer = () => {
      if (typeof renderPlayerAnalysis === "function") {
        renderPlayerAnalysis();
      }
    };
    requestAnimationFrame(refreshPlayer);
    setTimeout(refreshPlayer, 0);
  }
  if (desired === "set-trend") {
    const refreshSetTrend = () => {
      if (typeof renderSetTrendAnalysis === "function") {
        renderSetTrendAnalysis();
      }
    };
    requestAnimationFrame(refreshSetTrend);
    setTimeout(refreshSetTrend, 0);
  }
  if (desired === "play-by-play") {
    const refreshPlayByPlay = () => {
      if (typeof renderPlayByPlayAnalysis === "function") {
        renderPlayByPlayAnalysis();
      }
    };
    requestAnimationFrame(refreshPlayByPlay);
    setTimeout(refreshPlayByPlay, 0);
  }
  if (desired === "skill-charts") {
    const refreshCharts = () => {
      if (typeof renderAnalysisSkillChartsPanel === "function") {
        renderAnalysisSkillChartsPanel();
      }
    };
    requestAnimationFrame(refreshCharts);
    setTimeout(refreshCharts, 0);
  }
  if (desired === "match-sheet") {
    const refreshMatchSheet = () => {
      if (typeof renderMatchSheetAnalysis === "function") {
        renderMatchSheetAnalysis();
      }
    };
    requestAnimationFrame(refreshMatchSheet);
    setTimeout(refreshMatchSheet, 0);
  }
}
function setActiveTab(target) {
  if (!target) return;
  const isExportAnalysisHtml =
    typeof window !== "undefined" && !!window.__EXPORT_ANALYSIS_HTML__;
  if (
    !isExportAnalysisHtml &&
    target !== "match" &&
    typeof window !== "undefined" &&
    typeof hasUsableMatch === "function" &&
    !hasUsableMatch()
  ) {
    target = "match";
  }
  const prevTab = activeTab;
  if (prevTab === "video" && target !== "video") {
    resetAttackShortcutModals();
  }
  activeTab = target;
  if (target === "aggregated" && typeof window !== "undefined" && window.trackVolleyEyeEventOnce) {
    window.trackVolleyEyeEventOnce("analysis_opened");
  }
  state.uiActiveTab = target;
  if (!isLoadingMatch) saveState();
  document.body.dataset.activeTab = target;
  if (document && document.documentElement) {
    document.documentElement.dataset.activeTab = target;
  }
  tabButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tabTarget === target);
  });
  tabPanels.forEach(panel => {
    panel.classList.toggle("active", panel.dataset.tab === target);
  });
  if (
    target === "aggregated" &&
    (activeAggTab === "trajectory" ||
      activeAggTab === "serve" ||
      activeAggTab === "player" ||
      activeAggTab === "skill-charts" ||
      activeAggTab === "play-by-play" ||
      activeAggTab === "match-sheet" ||
      activeAggTab === "set-trend")
  ) {
    const refresh = () => {
      if (typeof renderTrajectoryAnalysis === "function" && activeAggTab === "trajectory") {
        renderTrajectoryAnalysis();
      }
      if (typeof renderServeTrajectoryAnalysis === "function" && activeAggTab === "serve") {
        renderServeTrajectoryAnalysis();
      }
      if (typeof renderPlayerAnalysis === "function" && activeAggTab === "player") {
        renderPlayerAnalysis();
      }
      if (typeof renderSetTrendAnalysis === "function" && activeAggTab === "set-trend") {
        renderSetTrendAnalysis();
      }
      if (typeof renderPlayByPlayAnalysis === "function" && activeAggTab === "play-by-play") {
        renderPlayByPlayAnalysis();
      }
      if (typeof renderAnalysisSkillChartsPanel === "function" && activeAggTab === "skill-charts") {
        renderAnalysisSkillChartsPanel();
      }
      if (typeof renderMatchSheetAnalysis === "function" && activeAggTab === "match-sheet") {
        renderMatchSheetAnalysis();
      }
    };
    requestAnimationFrame(refresh);
    setTimeout(refresh, 0);
  }
  if (prevTab === "video" && target !== "video") {
    stopPlayByPlay();
  }
  if (target === "scout" && shouldOpenNextSetModal()) {
    openNextSetModal(state.currentSet || 1);
  }
  if (target === "scout") {
    requestAnimationFrame(() => applyScoutColumnLayout());
  }
}
function initTabs() {
  if (!tabButtons || !tabPanels) return;
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tabTarget;
      if (target) {
        if (
          target !== "match" &&
          typeof window !== "undefined" &&
          typeof hasUsableMatch === "function" &&
          !hasUsableMatch()
        ) {
          alert("Crea e seleziona una partita prima di usare le altre sezioni.");
          setActiveTab("match");
          return;
        }
        setActiveTab(target);
      }
    });
  });
  setActiveTab("info");
}
function initSwipeTabs() {
  if (!("ontouchstart" in window)) return;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let startTarget = null;
  let startedInSwipeZone = false;
  let lastX = null;
  let lastY = null;
  const minDistance = 90;
  const maxOffset = 35;
  const maxTime = 600;
  const swipeZoneRatio = 0.25;
  const tabsOrder = ["match", "info", "scout", "aggregated", "video", "training"];
  const onStart = e => {
    if (!e.touches || e.touches.length === 0) {
      startedInSwipeZone = false;
      return;
    }
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    startTime = Date.now();
    startTarget = e.target;
    const height = window.innerHeight || document.documentElement.clientHeight || 0;
    const zoneBottom = height * swipeZoneRatio;
    startedInSwipeZone = startY <= zoneBottom;
    lastX = startX;
    lastY = startY;
  };
  const onMove = e => {
    if (!startedInSwipeZone) return;
    if (!e.touches || e.touches.length === 0) return;
    const t = e.touches[0];
    lastX = t.clientX;
    lastY = t.clientY;
  };
  const onEnd = e => {
    if (elSkillModal && !elSkillModal.classList.contains("hidden")) return;
    if (!startedInSwipeZone) return;
    if (lastX === null || lastY === null) return;
    const dx = lastX - startX;
    const dy = lastY - startY;
    const dt = Date.now() - startTime;
    if (dt > maxTime) return;
    if (Math.abs(dy) > maxOffset) return;
    if (Math.abs(dx) < minDistance) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.2) return;
    if (activeTab === "aggregated" && startTarget instanceof Element) {
      const scrollable = startTarget.closest(
        ".table-wrapper, .trajectory-layout, .trajectory-grid, .serve-trajectory-grid, .video-analysis__grid, .video-table-wrapper"
      );
      if (scrollable && scrollable.scrollWidth > scrollable.clientWidth) return;
    }
    if (document.body.classList.contains("drawer-menu-open")) {
      if (dx < 0) document.body.classList.remove("drawer-menu-open");
      return;
    }
    if (document.body.classList.contains("drawer-log-open")) {
      if (dx > 0) document.body.classList.remove("drawer-log-open");
      return;
    }
    const dir = dx > 0 ? "right" : "left";
    const idx = tabsOrder.indexOf(activeTab);
    if (idx === -1) return;
    const nextIdx = dir === "left" ? Math.min(tabsOrder.length - 1, idx + 1) : Math.max(0, idx - 1);
    if (nextIdx !== idx) setActiveTab(tabsOrder[nextIdx]);
    startedInSwipeZone = false;
    lastX = null;
    lastY = null;
  };
  document.addEventListener("touchstart", onStart, { passive: true });
  document.addEventListener("touchmove", onMove, { passive: true });
  document.addEventListener("touchend", onEnd, { passive: true });
}
function setupFocusGuards() {
  const shouldBlurElement = el => {
    if (!(el instanceof HTMLElement)) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === "button") return true;
    if (tag === "input") {
      const type = (el.type || "").toLowerCase();
      return ["checkbox", "radio", "button", "submit", "reset"].includes(type);
    }
    return el.getAttribute("role") === "button";
  };
  document.addEventListener(
    "click",
    () => {
      window.setTimeout(() => {
        const active = document.activeElement;
        if (shouldBlurElement(active)) active.blur();
      }, 0);
    },
    true
  );
}
function ensureBaseRotationDefault() {
  const rot = parseInt(state.rotation, 10);
  if (!rot || rot < 1 || rot > 6) {
    state.rotation = 1;
    updateRotationDisplay();
    saveState();
  }
}
function initBugReportLink() {
  const link = document.getElementById("btn-report-bug");
  if (!link) return;
  const versionMeta =
    typeof window !== "undefined" && window.__APP_VERSION__ ? window.__APP_VERSION__ : null;
  const version = versionMeta && versionMeta.version ? versionMeta.version : "non disponibile";
  const page =
    window.location.protocol === "file:"
      ? "Esecuzione locale (file://)"
      : `${window.location.origin}${window.location.pathname}`;
  const body = [
    "## Passaggi per riprodurre il problema",
    "1. ",
    "2. ",
    "3. ",
    "",
    "## Cosa ti aspettavi accadesse",
    "Descrivi il risultato che ti aspettavi.",
    "",
    "## Cosa invece è accaduto",
    "Descrivi il risultato effettivamente osservato.",
    "",
    "## Informazioni tecniche",
    `- Versione VolleyEye: ${version}`,
    `- Pagina: ${page}`,
    `- Browser: ${navigator.userAgent}`,
    `- Lingua: ${navigator.language || "non disponibile"}`,
    "",
    "> Non allegare dati sensibili o informazioni personali del match."
  ].join("\n");
  const params = new URLSearchParams({
    title: "[Bug] ",
    body
  });
  link.href = `https://github.com/davidaffo/VolleyEye/issues/new?${params.toString()}`;
}
