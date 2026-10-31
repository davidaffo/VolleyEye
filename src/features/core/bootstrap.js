import { updateVideoScoutModeLayout } from "../video/view-commands.js";
import { renderVideoAnalysis } from "../video/playback.js";
import { shouldOpenNextSetModal, openNextSetModal } from "../live/next-set-lineups.js";
import { session as matchState } from "../../../js/globals.js";
import { registerServiceWorker } from "./app-lifecycle.js";
import { session as rosterLineupState } from "../state/roster-lineup.js";
import { saveState } from "../storage/save-state.js";
import { showDefaultDemoWelcomePopup } from "../io/match-io.js";
import { initializeApplicationState } from "./bootstrap-state.js";
import { bindRosterAndArchiveControls } from "./bindings-roster.js";
import { bindScoutSettingsControls } from "./bindings-scout-settings.js";
import { bindDataAndNavigationControls } from "./bindings-data.js";
import { bindVideoControls } from "./bindings-video.js";
import { bindScoreAndSetControls } from "./bindings-score.js";
import { bindModalAndGlobalControls } from "./bindings-modals.js";

export async function finalizeApplicationBootstrap(context) {
  const { isExportAnalysisHtml, linkImport, defaultDemoCreated } = context;
  updateVideoScoutModeLayout();
  renderVideoAnalysis();
  if (shouldOpenNextSetModal()) {
    openNextSetModal(matchState.state.currentSet || 1);
  }
  if (!isExportAnalysisHtml) {
    registerServiceWorker();
  }
  rosterLineupState.isLoadingMatch = false;
  if (typeof window !== "undefined") {
    window.isLoadingMatch = false;
  }
  if (linkImport && linkImport.imported) {
    saveState();
    if (linkImport.name) {
      alert("Match importato dal link: " + linkImport.name);
    } else {
      alert("Match importato dal link.");
    }
  }
  if (defaultDemoCreated) {
    await showDefaultDemoWelcomePopup();
  }
}

export async function init() {
  const context = await initializeApplicationState();
  bindRosterAndArchiveControls();
  bindScoutSettingsControls();
  bindDataAndNavigationControls();
  bindVideoControls();
  bindScoreAndSetControls();
  bindModalAndGlobalControls();
  await finalizeApplicationBootstrap(context);
}
