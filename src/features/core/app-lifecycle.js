import { resetMatchVideoState } from "../video/reset-model.js";
import { resetMatchVideoPlayback } from "../video/reset-commands.js";
import { stripCourtReplacements } from "../../domain/player-names.js";
import { STORAGE_KEY, session as matchState } from "../../../js/globals.js";
import { resetSetTypeState } from "../live/flow-model.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { session as scoutUiState } from "../state/scout-ui.js";
import { broadcastResetSignal, navigateToResetBootstrap, applyScoutColumnLayout } from "../scout-ui.js";
import { enforceAutoLiberoForState, initStats } from "../teams/court-state-model.js";
import { renderEventsLog } from "../events/log-view.js";
import { saveState } from "../storage/save-state.js";
import { buildMatchDisplayName } from "../teams/match-details.js";
import { recalcAllStatsAndUpdateUI } from "../analysis/stats-update.js";
import { renderPlayers } from "../live/team-rendering.js";
import { updateRotationDisplay } from "../teams/court-view.js";
import { session as stateDbState } from "../state/storage-state-db.js";
import { getStateDb } from "../storage/state-db.js";
import { hasUsableMatch, getSelectedArchivedMatch, syncMatchesFromStorage } from "../storage/match-repository.js";
import { session as teamManagementState } from "../state/live-team-management.js";
import { resetAttackShortcutModals } from "../live/team-management.js";
import { session as persistentStorageState } from "../state/storage-persistent-storage.js";
import { publishRuntimeView, updateMatchButtonsState, renderMatchesList, renderMatchSummary } from "./runtime-view.js";
import { shouldOpenNextSetModal, openNextSetModal } from "../live/next-set-lineups.js";
import { renderTrajectoryAnalysis, renderServeTrajectoryAnalysis } from "../analysis/trajectory-rendering.js";
import { updateBannerStore } from "../../state/roster-import-store.mjs";
import { listenRuntime, session as browserEffectsState } from "../../app/browser-effects.js";
import { renderPlayerAnalysis } from "../analysis/skill-tables.js";
import { renderSetTrendAnalysis, renderPlayByPlayAnalysis } from "../live/score-analysis.js";
import { renderAnalysisSkillChartsPanel } from "../analysis/skill-analysis.js";
import { renderMatchSheetAnalysis } from "../analysis/match-sheet.js";
import { stopPlayByPlay, scheduleVideoMobileSourcePrompt } from "../video/playback.js";

export function resetMatch() {
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
  const preservedCourt = matchState.state.court ? stripCourtReplacements(matchState.state.court) : Array.from({ length: 6 }, () => ({ main: "" }));
  const preservedRotation = matchState.state.rotation || 1;
  const preservedServing = !!matchState.state.isServing;
  const preservedAutoRoleCourt = Array.isArray(matchState.state.autoRoleBaseCourt)
    ? stripCourtReplacements(matchState.state.autoRoleBaseCourt)
    : [];
  const preservedPreferredLibero = matchState.state.preferredLibero || "";
  matchState.state.events = [];
  matchState.state.court = preservedCourt;
  matchState.state.rotation = preservedRotation;
  matchState.state.autoRoleBaseCourt = preservedAutoRoleCourt;
  rosterLineupState.autoRoleBaseCourt = preservedAutoRoleCourt.length ? [...preservedAutoRoleCourt] : rosterLineupState.autoRoleBaseCourt;
  matchState.state.currentSet = 1;
  matchState.state.setResults = {};
  matchState.state.setStarts = {};
  matchState.state.scoreOverrides = {};
  matchState.state.matchFinished = false;
  matchState.state.autoRotatePending = false;
  matchState.state.opponentAutoRotatePending = false;
  matchState.state.skillFlowOverride = null;
  matchState.state.opponentSkillFlowOverride = null;
  matchState.state.freeballPending = false;
  matchState.state.freeballPendingScope = "our";
  matchState.state.flowTeamScope = "our";
  matchState.state.matchEndSetSnapshot = null;
  matchState.state.matchEndSetRecorded = null;
  Object.keys(scoutUiState.selectedSkillPerPlayer).forEach(key => delete scoutUiState.selectedSkillPerPlayer[key]);
  matchState.state.isServing = preservedServing;
  matchState.state.liberoAutoMap = {};
  matchState.state.preferredLibero = preservedPreferredLibero;
  enforceAutoLiberoForState({ skipServerOnServe: true });
  matchState.state.skillClock = { paused: true, pausedAtMs: null, pausedAccumMs: 0, lastEffectiveMs: 0 };
  resetMatchVideoState();
  resetMatchVideoPlayback({ includeScout: true });

  initStats();
  saveState();
  recalcAllStatsAndUpdateUI();
  renderEventsLog();
  renderPlayers();
  updateRotationDisplay();
}

export function deleteIndexedDbByName(name) {
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

export async function deleteAllIndexedDbDatabases() {
  if (!("indexedDB" in window)) return;
  const targets = new Set();
  if (typeof stateDbState.STATE_DB_NAME !== "undefined" && stateDbState.STATE_DB_NAME) {
    targets.add(stateDbState.STATE_DB_NAME);
  }
  if (typeof teamManagementState.LOCAL_VIDEO_DB !== "undefined" && teamManagementState.LOCAL_VIDEO_DB) {
    targets.add(teamManagementState.LOCAL_VIDEO_DB);
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

export async function clearStateSnapshotFromIndexedDb() {
  ;
  try {
    const db = await getStateDb();
    if (!db) return;
    await new Promise(resolve => {
      try {
        const tx = db.transaction(stateDbState.STATE_DB_STORE, "readwrite");
        tx.objectStore(stateDbState.STATE_DB_STORE).delete(STORAGE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch (_) {
        resolve();
      }
    });
    if (typeof persistentStorageState.archiveStorage !== "undefined") {
      await Promise.allSettled(Array.from(persistentStorageState.archiveStorage.pending));
      persistentStorageState.archiveStorage.db = null;
      persistentStorageState.archiveStorage.cache.clear();
    }
    db.close();
    if (typeof stateDbState.stateDbPromise !== "undefined") {
      stateDbState.stateDbPromise = null;
    }
  } catch (_) {
    // ignore
  }
}

export async function resetAppData() {
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

export async function forceRefreshAppAssets() {
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








export function registerServiceWorker() {
  if (typeof location !== "undefined" && location.protocol === "file:") {
    return;
  }
  const supportsSw = "serviceWorker" in navigator;
  const secureContext =
    window.isSecureContext || location.protocol === "https:" || location.hostname === "localhost";
  const isLocalDevHost =
    (location.hostname === "localhost" ||
      location.hostname === "127.0.0.1" ||
      location.hostname === "::1") && window.__APP_PRODUCTION__ !== true;
  const appVersionMeta =
    typeof window !== "undefined" && window.__APP_VERSION__ ? window.__APP_VERSION__ : null;
  const currentVersion = appVersionMeta && appVersionMeta.version ? appVersionMeta.version : "";

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
    updateBannerStore.publish({message:msg||"Aggiornamento disponibile."});
  };
  const showBanner = () => {
    if (!banner) return;
    updateBannerStore.publish({visible:true});return;

  };
  const hideBanner = () => {
    if (!banner) return;
    updateBannerStore.publish({visible:false});
    document.documentElement.style.setProperty("--update-banner-offset", "0px");
  };
  const refresh=()=>{if(!waitingWorker){reloadWithCacheBust();return;}sessionStorage.setItem("sw-refresh-requested","1");waitingWorker.postMessage({type:"SKIP_WAITING"});};
  updateBannerStore.publish({refresh,dismiss:hideBanner});
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
  const register = () => {
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
  };
  if (document.readyState === "complete") register();
  else listenRuntime(window, "load", register, { once: true });
}

function getAggTabRenderer(tab, { includeServe = false } = {}) {
  switch (tab) {
    case "trajectory":
      return includeServe
        ? () => {
            renderTrajectoryAnalysis();
            renderServeTrajectoryAnalysis();
          }
        : renderTrajectoryAnalysis;
    case "serve":
      return renderServeTrajectoryAnalysis;
    case "player":
      return renderPlayerAnalysis;
    case "set-trend":
      return renderSetTrendAnalysis;
    case "play-by-play":
      return renderPlayByPlayAnalysis;
    case "skill-charts":
      return renderAnalysisSkillChartsPanel;
    case "match-sheet":
      return renderMatchSheetAnalysis;
    default:
      return null;
  }
}

function scheduleAggRefresh(refresh) {
  requestAnimationFrame(refresh);
  browserEffectsState.setTimeout(refresh, 0);
}

export function setActiveAggTab(target) {
  const desired = target || "summary";
  rosterLineupState.activeAggTab = desired;
  matchState.state.uiAggTab = desired;
  if (!rosterLineupState.isLoadingMatch) saveState();
  if (document && document.body) {
    document.body.dataset.aggTab = desired;
  }
  const refresh = getAggTabRenderer(desired, { includeServe: true });
  if (refresh) scheduleAggRefresh(refresh);
}

export function setActiveTab(target) {
  if (!target) return;
  const isExportAnalysisHtml =
    typeof window !== "undefined" && !!window.__EXPORT_ANALYSIS_HTML__;
  const isGlobalTarget = target === "info";
  const isLobbyTarget = target === "match";
  const sessionActive = !!(matchState.state && matchState.state.uiMatchSessionActive && hasUsableMatch());
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
  const prevTab = rosterLineupState.activeTab;
  if (prevTab === "video" && target !== "video") {
    resetAttackShortcutModals();
  }
  rosterLineupState.activeTab = target;
  if (target === "aggregated" && typeof window !== "undefined" && window.trackVolleyEyeEventOnce) {
    window.trackVolleyEyeEventOnce("analysis_opened");
  }
  matchState.state.uiActiveTab = target;
  if (!rosterLineupState.isLoadingMatch) saveState();
  document.body.dataset.activeTab = target;
  if (document && document.documentElement) {
    document.documentElement.dataset.activeTab = target;
  }
  syncMatchSessionUI();

  if (target === "aggregated" && getAggTabRenderer(rosterLineupState.activeAggTab)) {
    // Navigation can change again before either deferred callback runs.
    scheduleAggRefresh(() => getAggTabRenderer(rosterLineupState.activeAggTab)?.());
  }
  if (prevTab === "video" && target !== "video") {
    stopPlayByPlay();
  }
  if (target === "scout" && shouldOpenNextSetModal()) {
    openNextSetModal(matchState.state.currentSet || 1);
  }
  if (target === "scout") {
    requestAnimationFrame(() => applyScoutColumnLayout());
  }
  if (target === "video") {
    scheduleVideoMobileSourcePrompt();
  }
  publishRuntimeView();
}

export function navigateToTab(target) {
  if (!target) return;
  if (
    !["match", "info"].includes(target) &&
    typeof hasUsableMatch === "function" &&
    !hasUsableMatch()
  ) {
    alert("Crea e seleziona una partita prima di usare le altre sezioni.");
    setActiveTab("match");
    return;
  }
  setActiveTab(target);
}

export function initTabs() {
  if (!rosterLineupState.tabButtons || !rosterLineupState.tabPanels) return;

  setActiveTab("match");
}

export function syncMatchSessionUI() {
  const active = !!(matchState.state && matchState.state.uiMatchSessionActive && hasUsableMatch());
  if (matchState.state) matchState.state.uiMatchSessionActive = active;
  if (document && document.body) {
    document.body.dataset.matchSession = active ? "true" : "false";
  }
  if (document && document.documentElement) {
    document.documentElement.dataset.matchSession = active ? "true" : "false";
  }
  const label = document.getElementById("active-match-name");
  if (label) {
    const displayName = (buildMatchDisplayName(matchState.state.match || {}));
    const text = displayName || matchState.state.loadedMatchName || matchState.state.selectedMatch || "Partita";

    if (document && document.body) document.body.dataset.matchLabel = text;
    publishRuntimeView();
  }
}



export function initMobileNavigation() {
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
  listenRuntime(document, "click", event => {
    if (!navigation.contains(event.target)) close(false);
  });
  listenRuntime(document, "keydown", event => {
    if (event.key === "Escape") close(true);
  });
}

export function setupFocusGuards() {
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
  listenRuntime(document,
    "click",
    () => {
      browserEffectsState.setTimeout(() => {
        const active = document.activeElement;
        if (shouldBlurElement(active)) active.blur();
      }, 0);
    },
    true
  );
}

export function ensureBaseRotationDefault() {
  const rot = parseInt(matchState.state.rotation, 10);
  if (!rot || rot < 1 || rot > 6) {
    matchState.state.rotation = 1;
    updateRotationDisplay();
    saveState();
  }
}

export function initBugReportLink() {
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

export function applyMatchRequirementLock() {
  const hasMatches = hasUsableMatch();
  if (!hasMatches) matchState.state.uiMatchSessionActive = false;
  if (document && document.body) {
    document.body.dataset.noMatch = hasMatches ? "false" : "true";
  }
  if (rosterLineupState.tabButtons && rosterLineupState.tabButtons.forEach) {
    rosterLineupState.tabButtons.forEach(btn => {
      const target = btn && btn.dataset ? btn.dataset.tabTarget : "";
      if (!target) return;
      btn.disabled = false;
      btn.dataset.noMatchLocked = !hasMatches && !["match", "info"].includes(target) ? "true" : "false";
    });
  }
  syncMatchSessionUI();
  if (!hasMatches && typeof setActiveTab === "function" && !["match", "info"].includes(rosterLineupState.activeTab)) {
    setActiveTab("match");
  }
}

export function renderMatchesSelect() {
  if (!rosterLineupState.elSavedMatchesSelect) return;
  syncMatchesFromStorage();
  const names = Object.keys(matchState.state.savedMatches || {});
  const prev = getSelectedArchivedMatch() || matchState.state.selectedMatch || "";

    matchState.state.selectedMatch = names.includes(prev) ? prev : "";
    renderMatchesList(names, matchState.state.selectedMatch);
    applyMatchRequirementLock();
    renderMatchSummary();
    updateMatchButtonsState();
    return;

}
