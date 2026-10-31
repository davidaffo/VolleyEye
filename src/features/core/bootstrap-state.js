import { ensureMatchDefaults } from "../teams/match-details.js";
import { renderPlayers } from "../live/team-rendering.js";
import { updateCourtModalPlacement, initCrossTabResetSync, applyVideoLayoutWidths, applyScoutColumnLayout, applyTopBarVisibility } from "../scout-ui.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { initBugReportLink, initTabs, initMobileNavigation, setupFocusGuards, setActiveAggTab, clearStateSnapshotFromIndexedDb, deleteAllIndexedDbDatabases, syncMatchSessionUI, setActiveTab, ensureBaseRotationDefault, renderMatchesSelect } from "./app-lifecycle.js";
import { resetAttackShortcutModals } from "../live/team-management.js";
import { initSetTypeShortcuts, handleVideoShortcut } from "../live/scout-shortcuts.js";
import { listenRuntime } from "../../app/browser-effects.js";
import { clearCachedLocalVideo } from "../video/local-file-storage.js";
import { renderYoutubePlayer, renderYoutubePlayerScout } from "../video/youtube-player.js";
import { restoreYoutubeFromState, restoreCachedLocalVideo } from "../video/video-sources.js";
import { initializePersistentStorage } from "../storage/persistent-storage.js";
import { session as persistentStorageState } from "../state/storage-persistent-storage.js";
import { applyStateSnapshot, loadStateFromIndexedDb, loadState, applyTheme } from "../teams/core/state-store.js";
import { listMatchesFromStorage, syncMatchesFromStorage, saveMatchToStorage } from "../storage/match-repository.js";
import { publishTeamsManagerView } from "../teams/manager-view.js";
import { listTeamsFromStorage } from "../teams/storage/team-repository.js";
import { readMatchLinkParam, maybeImportMatchFromUrl } from "../io/file-and-url-import.js";
import { getDefaultDemoPreference, loadDefaultDemoMatch } from "../io/match-io.js";
import { session as matchIoState } from "../state/io-match-io.js";
import { getCurrentMatchPayload } from "../teams/current-payload.js";
import { session as matchState } from "../../../js/globals.js";
import { publishReactSettings } from "../settings/view.js";
import { initStats } from "../teams/court-state-model.js";
import { updateRotationDisplay } from "../teams/court-view.js";
import { renderLiberoBench } from "../scout/court-commands.js";
import { applyAutoRolePositioning } from "../teams/court/court-engine.js";
import { renderMetricsConfig } from "../settings/metrics-view.js";
import { renderLiveScore, updateMatchStatusUI, setScoutControlsDisabled, publishRuntimeView } from "./runtime-view.js";
import { initLogServeTrajectoryControls } from "../analysis/trajectory-rendering.js";
import { applyTemplateTeam } from "../teams/editor/team-editor.js";
import { recalcAllStatsAndUpdateUI } from "../analysis/stats-update.js";
import { renderEventsLog } from "../events/log-view.js";
import { renderAggregatedTable } from "../analysis/aggregated-table.js";
import { ensureSkillClock, ensureVideoClock } from "../live/clocks.js";

export function applyForceMobileLayout(enabled) {
  document.body.classList.toggle("force-mobile", !!enabled);
  renderPlayers();
  updateCourtModalPlacement();
}

export async function initializeApplicationState() {
  rosterLineupState.isLoadingMatch = true;
  if (typeof window !== "undefined") {
    window.isLoadingMatch = true;
  }
  initCrossTabResetSync();
  initBugReportLink();
  initTabs();
  initMobileNavigation();
  setupFocusGuards();
  resetAttackShortcutModals();
  initSetTypeShortcuts();
  listenRuntime(document, "keydown", handleVideoShortcut, true);
  document.body.dataset.activeTab = rosterLineupState.activeTab;
  setActiveAggTab(rosterLineupState.activeAggTab || "summary");
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
    try {
      await clearCachedLocalVideo();
    } catch (_) {
      // ignore
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
    await clearStateSnapshotFromIndexedDb();
    try {
      await deleteAllIndexedDbDatabases();
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
  await initializePersistentStorage({ temporary: isExportAnalysisHtml });
  let loadedFromIndexedDb = false;
  let loadedFromLocalStorage = false;
  let defaultDemoCreated = false;
  if (isExportAnalysisHtml && typeof window !== "undefined" && window.__exportedAnalysisState) {
    applyStateSnapshot(window.__exportedAnalysisState, { skipStorageSync: true });
  } else if (!isExportAnalysisHtml && !resetRequestedByUrl && !resetJustCompleted) {
    loadedFromIndexedDb = await loadStateFromIndexedDb();
  }
  if (!isExportAnalysisHtml && !resetRequestedByUrl && !resetJustCompleted && !loadedFromIndexedDb) {
    loadedFromLocalStorage = loadState();
  }
  const hasStoredCollections =
    (listMatchesFromStorage().length > 0) ||
    (listTeamsFromStorage().length > 0);
  const hasMatchLink = !!readMatchLinkParam();
  const hasPersistedData = loadedFromIndexedDb || loadedFromLocalStorage || hasStoredCollections || hasMatchLink;
  if (!isExportAnalysisHtml && !hasPersistedData && getDefaultDemoPreference() !== "removed") {
    defaultDemoCreated = await loadDefaultDemoMatch();
  }
  applyVideoLayoutWidths();
  applyScoutColumnLayout();
  if (!isExportAnalysisHtml) {
    syncMatchesFromStorage();
  }
  // La sincronizzazione legge lo storage dei match; ribadisci il demo appena
  // creato per mantenerlo disponibile anche quando lo snapshot è stato scritto
  // prima del primo render.
  if (defaultDemoCreated) {
    matchState.state.selectedMatch = matchIoState.DEFAULT_DEMO_MATCH_NAME;
    matchState.state.loadedMatchName = matchIoState.DEFAULT_DEMO_MATCH_NAME;
    matchState.state.savedMatches = matchState.state.savedMatches || {};
    matchState.state.savedMatches[matchIoState.DEFAULT_DEMO_MATCH_NAME] = getCurrentMatchPayload(matchIoState.DEFAULT_DEMO_MATCH_NAME);
    saveMatchToStorage(matchIoState.DEFAULT_DEMO_MATCH_NAME, matchState.state.savedMatches[matchIoState.DEFAULT_DEMO_MATCH_NAME]);
  }
  matchState.state.setResults = matchState.state.setResults || {};
  matchState.state.setStarts = matchState.state.setStarts || {};
  syncMatchSessionUI();
  setActiveTab(matchState.state.uiActiveTab || rosterLineupState.activeTab || "match");
  setActiveAggTab(matchState.state.uiAggTab || rosterLineupState.activeAggTab || "summary");
  ensureBaseRotationDefault();
  const linkImport = await maybeImportMatchFromUrl();
  renderYoutubePlayer();
  renderYoutubePlayerScout();
  restoreCachedLocalVideo();
  restoreYoutubeFromState();
  applyTheme(matchState.state.theme || "dark");
  applyTopBarVisibility();
  ensureMatchDefaults();
  updateRotationDisplay();
  publishReactSettings();
  renderLiberoBench();
  publishReactSettings();
  renderLiberoBench();

  renderLiberoBench();
  renderMetricsConfig();
  publishTeamsManagerView();

  renderMatchesSelect();
  renderLiveScore();
  renderPlayers();
  initLogServeTrajectoryControls();

  applyForceMobileLayout(!!matchState.state.forceMobileLayout);
  updateCourtModalPlacement();
  if ((!matchState.state.players || matchState.state.players.length === 0) && !(matchState.state.useOpponentTeam && (matchState.state.opponentPlayers || []).length)) {
    applyTemplateTeam({ askReset: false });
  } else {
    if (!matchState.state.stats || Object.keys(matchState.state.stats).length === 0) {
      initStats();
      recalcAllStatsAndUpdateUI();
    }
    renderPlayers();
    renderEventsLog();
    renderAggregatedTable();
    renderLiberoBench();

    renderLiberoBench();
    renderMetricsConfig();
    publishTeamsManagerView();
  }
  if (matchState.state.autoRolePositioning) {
    applyAutoRolePositioning();
  }
  ensureSkillClock();
  ensureVideoClock();
  updateMatchStatusUI();
  publishRuntimeView();
  setScoutControlsDisabled(!!matchState.state.matchFinished);

  await persistentStorageState.archiveStorage.flush();
  return { isExportAnalysisHtml, defaultDemoCreated, linkImport };
}
