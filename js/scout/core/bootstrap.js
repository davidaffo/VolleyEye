async function finalizeApplicationBootstrap(context) {
  const { isExportAnalysisHtml, linkImport, defaultDemoCreated } = context;
  updateVideoScoutModeLayout();
  renderVideoAnalysis();
  attachModalCloseHandlers();
  if (shouldOpenNextSetModal()) {
    openNextSetModal(state.currentSet || 1);
  }
  if (!isExportAnalysisHtml) {
    registerServiceWorker();
  }
  isLoadingMatch = false;
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

async function init() {
  const context = await initializeApplicationState();
  bindRosterAndArchiveControls();
  bindScoutSettingsControls();
  bindDataAndNavigationControls();
  bindVideoControls();
  bindScoreAndSetControls();
  bindModalAndGlobalControls();
  await finalizeApplicationBootstrap(context);
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch(error => {
    console.error("Avvio archivio non riuscito", error);
    alert("Impossibile aprire l’archivio. " + error.message);
  });
});
