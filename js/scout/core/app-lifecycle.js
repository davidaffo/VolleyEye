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
    if (typeof archiveStorage !== "undefined") {
      await Promise.allSettled(Array.from(archiveStorage.pending));
      archiveStorage.db = null;
      archiveStorage.cache.clear();
    }
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
function captureScoutActionSnapshot({ includeSetState = false } = {}) {
  // Una ricevuta contiene solo lo stato di gioco, mai storico, archivi o video.
  const keys = [
    "currentSet", "rotation", "opponentRotation", "isServing", "matchFinished",
    "court", "opponentCourt", "courtSideSwapped", "autoRotatePending",
    "opponentAutoRotatePending", "autoRoleBaseCourt", "opponentAutoRoleBaseCourt",
    "liberoAutoMap", "opponentLiberoAutoMap", "preferredLibero", "opponentPreferredLibero",
    "pendingServe", "freeballPending", "freeballPendingScope", "flowTeamScope"
  ];
  if (includeSetState) keys.push(
    "setResults", "setStarts", "skillClock", "videoClock",
    "matchEndSetSnapshot", "matchEndSetRecorded"
  );
  const before = {};
  const missing = [];
  keys.forEach(key => {
    if (state[key] === undefined) missing.push(key);
    else before[key] = state[key];
  });
  const events = state.events || [];
  return JSON.parse(JSON.stringify({
    version: 1,
    eventCount: events.length,
    previousEventId: events.length ? events[events.length - 1].eventId ?? null : null,
    before,
    missing
  }));
}
function attachScoutActionSnapshot(event, snapshot) {
  if (!event || !snapshot) return event;
  // Identifica gli eventi dell'operazione: il log può ricevere inserimenti
  // dall'analisi anche tra due eventi già registrati.
  if (event.eventId != null) {
    snapshot.actionEventIds = Array.from(new Set((state.events || []).slice(snapshot.eventCount)
      .concat(event).map(item => item && item.eventId).filter(id => id != null)));
  }
  // Il dato enumerabile sopravvive a JSON, IndexedDB e archivio partite.
  event.undoState = snapshot;
  Object.defineProperty(event, "__undoSnapshot", {
    value: snapshot,
    enumerable: false,
    configurable: true
  });
  return event;
}
function clearScoutFlowOverridesAfterUndo() {
  state.skillFlowOverride = null;
  state.opponentSkillFlowOverride = null;
  state.forceSkillActive = false;
  state.forceSkillScope = null;
}
function removeScoutEventReferences(removed) {
  const ids = new Set(removed.map(event => event && event.eventId).filter(id => id != null));
  (state.events || []).forEach(event => {
    if (!event) return;
    if (Array.isArray(event.relatedEvents)) event.relatedEvents = event.relatedEvents.filter(id => !ids.has(id));
    if (Array.isArray(event.relatedLinks)) event.relatedLinks = event.relatedLinks.filter(link => link && !ids.has(link.eventId));
  });
}
function refreshScoutAfterUndo() {
  if (typeof cancelPartialSkillFlowForScope === "function") {
    cancelPartialSkillFlowForScope("our");
    cancelPartialSkillFlowForScope("opponent");
  }
  clearScoutFlowOverridesAfterUndo();
  if (typeof resetSetTypeState === "function") resetSetTypeState();
  // Anche il contesto fuori da state deve corrispondere agli eventi rimasti.
  if (typeof lastReceiveContext !== "undefined") {
    lastReceiveContext = { our: null, opponent: null };
    const set = Number(state.currentSet || 1);
    (state.events || []).forEach(event => {
      if (!event || Number(event.set || 1) !== set) return;
      const scope = getTeamScopeFromEvent(event);
      if (event.skillId === "serve" || event.skillId === "attack" || getPointDirection(event)) {
        lastReceiveContext[scope] = null;
      } else if (event.skillId === "pass" && typeof rememberReceiveContext === "function") {
        rememberReceiveContext(event);
      }
    });
  }
  const restoredBaseCourt = (base, court) => JSON.parse(JSON.stringify(
    Array.isArray(base) && base.length === 6 ? base : court || []
  ));
  if (typeof autoRoleBaseCourt !== "undefined") autoRoleBaseCourt = restoredBaseCourt(state.autoRoleBaseCourt, state.court);
  if (typeof opponentAutoRoleBaseCourt !== "undefined") opponentAutoRoleBaseCourt = restoredBaseCourt(state.opponentAutoRoleBaseCourt, state.opponentCourt);
  if (typeof resetAutoRoleCache === "function") resetAutoRoleCache();
  if (typeof syncCurrentSetUI === "function") syncCurrentSetUI(state.currentSet || 1);
  if (typeof syncCourtSideLayout === "function") syncCourtSideLayout();
  recalcAllStatsAndUpdateUI();
  saveState({ persistLocal: true });
  renderEventsLog();
  renderPlayers();
  renderLiberoChipsInline();
  renderLineupChips();
  updateRotationDisplay();
  if (typeof renderOpponentPlayers === "function") renderOpponentPlayers();
  if (typeof renderOpponentLiberoChipsInline === "function") renderOpponentLiberoChipsInline();
  if (typeof updateOpponentRotationDisplay === "function") updateOpponentRotationDisplay();
  renderLiveScore();
  updateSetScoreDisplays();
  if (typeof updateMatchStatusUI === "function") updateMatchStatusUI();
}
function restoreScoutActionSnapshot(snapshot) {
  if (!snapshot || snapshot.version !== 1 || !snapshot.before || typeof snapshot.before !== "object" ||
      Array.isArray(snapshot.before) || !Array.isArray(snapshot.missing)) return false;
  const patches = snapshot.eventPatches || [];
  if (!Array.isArray(patches) || patches.some(patch => !patch || !patch.before || !patch.after)) return false;
  const events = state.events || [];
  let removed;
  if (Array.isArray(snapshot.actionEventIds) && snapshot.actionEventIds.length) {
    const owned = new Set(snapshot.actionEventIds);
    const last = events[events.length - 1];
    if (!last || !owned.has(last.eventId)) return false;
    removed = events.filter(event => event && owned.has(event.eventId));
    for (let index = events.length - 1; index >= 0; index--) {
      if (events[index] && owned.has(events[index].eventId)) events.splice(index, 1);
    }
  } else {
    // Compatibilità con ricevute precedenti prive degli identificativi del gruppo.
    let count = snapshot.eventCount;
    if (snapshot.previousEventId != null) {
      const index = events.findIndex(event => event && event.eventId === snapshot.previousEventId);
      if (index === -1) return false;
      count = index + 1;
    }
    if (!Number.isInteger(count) || count < 0 || count >= events.length) return false;
    removed = events.splice(count);
  }
  // Non sostituiamo gli eventi precedenti: eventuali correzioni restano valide.
  patches.forEach(patch => {
    const event = events.find(item => item.eventId === patch.eventId);
    if (!event) return;
    ["code", "pendingBlockEval", "derivedFromBlock"].filter(key => Object.hasOwn(patch.before, key)).forEach(key => {
      if (JSON.stringify(event[key]) !== JSON.stringify(patch.after[key])) return;
      const value = patch.before[key];
      if (value === null) delete event[key];
      else event[key] = value;
    });
  });
  const schema = captureScoutActionSnapshot({ includeSetState: true });
  const allowed = new Set(Object.keys(schema.before).concat(schema.missing));
  snapshot.missing.forEach(key => { if (allowed.has(key)) delete state[key]; });
  Object.keys(snapshot.before).forEach(key => {
    if (allowed.has(key)) state[key] = JSON.parse(JSON.stringify(snapshot.before[key]));
  });
  removeScoutEventReferences(removed);
  refreshScoutAfterUndo();
  return true;
}
function restoreLegacyScoutSet(setNum) {
  const start = state.setStarts && state.setStarts[setNum];
  if (!start) return;
  state.courtSideSwapped = !!start.swapCourt;
  for (const scope of ["our", "opponent"]) {
    const initial = scope === "our" ? start.our : start.opponent;
    if (!initial || !Array.isArray(initial.court)) continue;
    let court = JSON.parse(JSON.stringify(initial.court));
    let rotation = Number(initial.rotation || 1);
    const rotateTo = value => {
      const target = Number(value);
      if (!Number.isInteger(target) || target < 1 || target > 6) return;
      const steps = (rotation - target + 6) % 6;
      court = court.slice(steps).concat(court.slice(0, steps));
      rotation = target;
    };
    (state.events || []).forEach(event => {
      if (Number(event.set || 1) !== Number(setNum)) return;
      const eventScope = getTeamScopeFromEvent(event);
      rotateTo(eventScope === scope ? event.rotation : event.opponentSetterPosition);
      if (eventScope === scope && event.actionType === "substitution") {
        court.forEach(slot => { if (slot.main === event.playerOut) slot.main = event.playerIn; });
      }
      if (event.autoRotationDirection && (event.autoRotationScope || "our") === scope) {
        rotateTo(event.autoRotationDirection === "ccw" ? (rotation + 4) % 6 + 1 : rotation % 6 + 1);
      }
    });
    state[scope === "our" ? "court" : "opponentCourt"] = court;
    state[scope === "our" ? "rotation" : "opponentRotation"] = rotation;
  }
}
function undoLastEvent() {
  if (!state.events || state.events.length === 0) {
    alert("Non ci sono eventi da annullare.");
    return;
  }
  const ev = state.events[state.events.length - 1];
  if (ev && ev.actionType === "set-change" &&
      !confirm(`Annullare il passaggio al set ${ev.nextSet || ev.set}? Tornerai al set ${ev.prevSet || 1} e al suo punteggio.`)) return;
  if (ev && restoreScoutActionSnapshot(ev.undoState || ev.__undoSnapshot)) {
    return;
  }
  const removed = [state.events.pop()];
  // Compatibilità con vecchi file: una ricezione e la battuta derivata sono una sola azione.
  const previous = state.events[state.events.length - 1];
  if (ev && ev.skillId === "pass" && previous && previous.derivedFromPassServe &&
      Number(previous.set || 1) === Number(ev.set || 1) &&
      (ev.relatedEvents || []).includes(previous.eventId)) removed.push(state.events.pop());
  if (ev && ev.skillId === "block") {
    (state.events || []).forEach(event => {
      if (event.skillId === "attack" && event.derivedFromBlock &&
          Number(event.set || 1) === Number(ev.set || 1) &&
          (event.relatedEvents || []).includes(ev.eventId)) {
        event.code = "/";
        event.pendingBlockEval = true;
        delete event.derivedFromBlock;
      }
    });
  }
  removeScoutEventReferences(removed);
  clearScoutFlowOverridesAfterUndo();
  state.freeballPending = false;
  state.freeballPendingScope = null;
  state.pendingServe = null;
  if (!ev) {
    refreshScoutAfterUndo();
    return;
  }
  if (ev.actionType === "set-change" || ev.actionType === "match-end") {
    const prevSet = ev.prevSet || 1;
    const prevFinished = !!ev.prevMatchFinished;
    if (ev.prevSetResults) {
      state.setResults = ev.prevSetResults;
    } else if (ev.actionType === "set-change") {
      state.setResults = Object.fromEntries(Object.entries(state.setResults || {}).filter(([key]) => Number(key) < Number(prevSet)));
    }
    if (ev.prevSetStarts) {
      state.setStarts = ev.prevSetStarts;
    } else if (ev.actionType === "set-change") {
      state.setStarts = Object.fromEntries(Object.entries(state.setStarts || {}).filter(([key]) => Number(key) <= Number(prevSet)));
    }
    state.matchFinished = prevFinished;
    restoreSkillClock(ev.prevClock || null);
    restoreVideoClock(ev.prevVideoClock || null);
    setCurrentSet(prevSet, { save: false });
    updateMatchStatusUI();
    setScoutControlsDisabled(!!state.matchFinished);
    restoreLegacyScoutSet(prevSet);
    recomputeServeFlagsFromHistory({ skipAutoLibero: true });
    refreshScoutAfterUndo();
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
  refreshScoutAfterUndo();
}
function undoContestedRally() {
  const events = state.events || [];
  const currentSet = Number(state.currentSet || 1);
  let serveIndex = -1;
  for (let index = events.length - 1; index >= 0; index--) {
    const event = events[index];
    if (!event) continue;
    if (
      Number(event.set || 1) !== currentSet ||
      event.actionType === "set-change" ||
      event.actionType === "match-end"
    ) break;
    if (event.skillId === "serve") {
      serveIndex = index;
      break;
    }
  }
  if (serveIndex === -1) {
    alert("Non c’è una battuta da annullare nell’azione corrente.");
    return;
  }
  // Uno snapshot può annullare insieme battuta derivata e ricezione.
  while (state.events.length > serveIndex) {
    const previousLength = state.events.length;
    undoLastEvent();
    if (state.events.length >= previousLength) break;
  }
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
  const isGlobalTarget = target === "info";
  const isLobbyTarget = target === "match";
  const sessionActive = !!(state && state.uiMatchSessionActive && hasUsableMatch());
  if (
    !isExportAnalysisHtml &&
    !isGlobalTarget &&
    !isLobbyTarget &&
    typeof window !== "undefined" &&
    typeof hasUsableMatch === "function" &&
    !hasUsableMatch()
  ) {
    target = "match";
  }
  if (!isExportAnalysisHtml && !isGlobalTarget) {
    if (sessionActive && isLobbyTarget) target = "scout";
    if (!sessionActive && !isLobbyTarget) target = "match";
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
  syncMatchSessionUI();
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
  if (target === "video" && typeof scheduleVideoMobileSourcePrompt === "function") {
    scheduleVideoMobileSourcePrompt();
  }
}
function initTabs() {
  if (!tabButtons || !tabPanels) return;
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tabTarget;
      if (target) {
        if (
          !["match", "info"].includes(target) &&
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
  setActiveTab("match");
}

function syncMatchSessionUI() {
  const active = !!(state && state.uiMatchSessionActive && hasUsableMatch());
  if (state) state.uiMatchSessionActive = active;
  if (document && document.body) {
    document.body.dataset.matchSession = active ? "true" : "false";
  }
  if (document && document.documentElement) {
    document.documentElement.dataset.matchSession = active ? "true" : "false";
  }
  const label = document.getElementById("active-match-name");
  if (label) {
    const displayName = typeof buildMatchDisplayName === "function" ? buildMatchDisplayName(state.match || {}) : "";
    label.textContent = displayName || state.loadedMatchName || state.selectedMatch || "Partita";
    if (document && document.body) document.body.dataset.matchLabel = label.textContent;
  }
}

function enterSelectedMatch() {
  if (!elSavedMatchesSelect || !elSavedMatchesSelect.value) return false;
  loadSelectedMatch();
  if (!hasUsableMatch()) return false;
  state.uiMatchSessionActive = true;
  syncMatchSessionUI();
  setActiveTab("scout");
  saveState({ persistLocal: true });
  return true;
}

function exitCurrentMatch() {
  if (!state || !state.uiMatchSessionActive) return;
  if (typeof pauseSkillClock === "function") pauseSkillClock();
  if (typeof pauseVideoClock === "function") pauseVideoClock();
  if (typeof persistCurrentMatch === "function") persistCurrentMatch({ allowCreate: false });
  state.uiMatchSessionActive = false;
  document.body.classList.remove("drawer-menu-open", "drawer-log-open");
  syncMatchSessionUI();
  setActiveTab("match");
  if (typeof renderMatchesSelect === "function") renderMatchesSelect();
  saveState({ persistLocal: true, skipMatchPersist: true });
}
function initMobileNavigation() {
  const navigation = document.getElementById("mobile-navigation");
  if (!navigation) return;
  const close = restoreFocus => {
    if (!navigation.open) return;
    navigation.open = false;
    if (restoreFocus) navigation.querySelector("summary").focus();
  };
  navigation.addEventListener("click", event => {
    if (event.target.closest("button")) close(true);
  });
  document.addEventListener("click", event => {
    if (!navigation.contains(event.target)) close(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") close(true);
  });
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
