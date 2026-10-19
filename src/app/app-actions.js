import { session as matchState } from "../../js/globals.js";
import { applyTopBarVisibility, backfillPlayerIdsInSavedMatches } from "../features/scout-ui.js";
import { saveState } from "../features/storage/save-state.js";
import { forceSyncDataFromLog } from "../features/video/event-editor.js";

import { resetTrajectoryFilters, resetServeTrajectoryFilters, resetVideoFilters } from "../features/analysis/analysis-filters.js";
import { resetSecondFilters } from "../features/analysis/second-distribution.js";
import { resetPlayerTrajectoryFilters, resetPlayerServeTrajectoryFilters } from "../features/analysis/player-trajectories.js";
import { resetPlayerSecondFilters } from "../features/analysis/player-second-distribution.js";
import { recordTimeoutEvent, recordOpponentTimeoutEvent } from "../features/video/video-events.js";
import { startReactPointPick, startReactErrorPick, resetReactScoutWidgets, openReactDatabasePicker, importReactDatabaseUrl, openReactLiveTeam, openReactLiveOpponent, openReactOpponentLineup } from "../features/archive/database-controls.js";
import { handleOpponentPoint, handleOpponentErrorPoint } from "../features/live/live-score-and-set.js";
import { openTeamsManagerModal, openDebugModal, toggleBaseModal, toggleAttackSetterModal, toggleAttackTypeModal, toggleBlockNumberModal } from "../features/live/team-management.js";
import { exportDatabaseToFile } from "../features/io/file-and-url-import.js";
import { removeDefaultDemoData } from "../features/io/match-io.js";
import { resetAppData, resetMatch, undoLastEvent, undoContestedRally } from "../features/core/app-lifecycle.js";
import { openMobileLineupModal } from "../features/live/lineup-editor.js";
import { triggerNetBlockPrompt } from "../features/live/game-flow.js";
import { exportAnalysisPdf, exportAnalysisHtml } from "../features/analysis/reports.js";
import { exportMatchToFile } from "../features/io/exports.js";
import { exportDataVolleyToFile } from "../features/io/datavolley-export.js";
import { resetMetricsToDefault, resetAllActiveCodes, resetPointRulesToDefault } from "../features/teams/settings/metrics-editor.js";
import { session as rosterLineupState } from "../features/state/roster-lineup.js";

export function toggleReactTopbar() {
  matchState.state.uiTopBarHidden = !matchState.state.uiTopBarHidden;
  applyTopBarVisibility();
  saveState({ persistLocal: true });
}

export function syncReactDebugLog() {
  forceSyncDataFromLog();
  alert("Dati riallineati dal log.");
}

export function backfillReactPlayerIds() {
  if (confirm("Scrivere gli ID giocatrici in tutti i match salvati?"))
    backfillPlayerIdsInSavedMatches();
}

export function runReactAppAction(name) {
  const actions = {
    resetTrajectoryFilters,
    resetServeTrajectoryFilters,
    resetSecondFilters,
    resetPlayerTrajectoryFilters,
    resetPlayerServeTrajectoryFilters,
    resetPlayerSecondFilters,
    resetVideoFilters,
    recordTimeoutEvent,
    recordOpponentTimeoutEvent,
    startReactPointPick,
    startReactErrorPick,
    handleOpponentPoint,
    handleOpponentErrorPoint,
    resetReactScoutWidgets,
    openTeamsManagerModal,
    openDebugModal,
    exportDatabaseToFile,
    openReactDatabasePicker,
    importReactDatabaseUrl,
    removeDefaultDemoData,
    resetAppData,
    openReactLiveTeam,
    openReactLiveOpponent,
    openMobileLineupModal,
    openReactOpponentLineup,
    toggleBaseModal,
    toggleAttackSetterModal,
    toggleAttackTypeModal,
    toggleBlockNumberModal,
    triggerNetBlockPrompt,
    exportAnalysisPdf,
    exportAnalysisHtml,
    exportMatchToFile,
    exportDataVolleyToFile,
    resetMatch,
    undoLastEvent,
    undoContestedRally,
    resetMetricsToDefault,
    resetAllActiveCodes,
    resetPointRulesToDefault,
  };
  if (!Object.hasOwn(actions, name))
    throw new Error("Unknown app action: " + name);
  return actions[name]();
}

export function openReactMatchFilePicker() {
  rosterLineupState.elMatchFileInput?.click();
}

export function changeReactScoutDrawer(drawer) {
  if (drawer === "menu") {
    document.body.classList.toggle("drawer-menu-open");
    document.body.classList.remove("drawer-log-open");
  } else if (drawer === "log") {
    document.body.classList.toggle("drawer-log-open");
    document.body.classList.remove("drawer-menu-open");
  } else document.body.classList.remove("drawer-menu-open", "drawer-log-open");
}
